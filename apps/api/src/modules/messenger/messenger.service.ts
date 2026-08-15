import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MetaGraphClient } from '@callwe/meta-ads-sdk';
import { PrismaService } from '../prisma/prisma.service.js';
import { IntegrationsService } from '../integrations/integrations.service.js';
import { MetaAdsService } from '../meta-ads/meta-ads.service.js';
import { env } from '../../config/env.js';

type Member = { role: string; agencyId?: string | null; subAccountId?: string | null };
type Caller = { id: string; memberships: Member[] };

// Janela de 24h da Meta pra responder livremente após a última mensagem do cliente.
const MESSAGING_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MessengerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
    private readonly metaAds: MetaAdsService,
  ) {}

  /** Sub-accounts que o usuário pode acessar (diretas + agência + super). */
  private async accessibleSubIds(user: Caller): Promise<string[]> {
    if (user.memberships.some((m) => m.role === 'super_admin')) {
      const all = await this.prisma.subAccount.findMany({ select: { id: true } });
      return all.map((s) => s.id);
    }
    const direct = user.memberships.map((m) => m.subAccountId).filter((v): v is string => !!v);
    const agencyIds = user.memberships
      .filter((m) => m.role === 'agency_admin')
      .map((m) => m.agencyId)
      .filter((v): v is string => !!v);
    let agencySubs: string[] = [];
    if (agencyIds.length) {
      const subs = await this.prisma.subAccount.findMany({
        where: { agencyId: { in: agencyIds } },
        select: { id: true },
      });
      agencySubs = subs.map((s) => s.id);
    }
    return [...new Set([...direct, ...agencySubs])];
  }

  // ---- Habilitar páginas (agência) ----

  /** Páginas do Facebook conectadas (via OAuth) disponíveis para habilitar. */
  listConnectedPages(subAccountId: string) {
    return this.metaAds.listPages(subAccountId);
  }

  /** Páginas já habilitadas para Messenger nesta sub-account. */
  listEnabledPages(subAccountId: string) {
    return this.prisma.messengerPage.findMany({
      where: { subAccountId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Habilita uma página: subscreve os campos de mensageria e registra o mapeamento. */
  async enablePage(
    subAccountId: string,
    input: { pageId: string; pageName: string; pageAccessToken: string; channel?: 'messenger' | 'instagram' },
  ) {
    const integration = await this.prisma.integration.findUnique({
      where: { subAccountId_provider: { subAccountId, provider: 'meta_ads' } },
    });
    if (!integration) throw new BadRequestException('Meta não conectado nesta conta');

    const client = new MetaGraphClient({
      accessToken: input.pageAccessToken,
      graphVersion: env.META_GRAPH_VERSION,
    });
    await client.subscribePageMessaging(input.pageId, input.pageAccessToken);

    // Guarda o page token (não expira) pras respostas do worker/Send API.
    const existing =
      (await this.integrations.getDecrypted<Record<string, unknown>>(subAccountId, 'meta_ads')) ?? {};
    await this.integrations.upsertCredentials(subAccountId, 'meta_ads', {
      ...existing,
      pageAccessToken: input.pageAccessToken,
      pageId: input.pageId,
    });

    return this.prisma.messengerPage.upsert({
      where: { pageId: input.pageId },
      update: { enabled: true, pageName: input.pageName, channel: input.channel ?? 'messenger' },
      create: {
        integrationId: integration.id,
        subAccountId,
        pageId: input.pageId,
        pageName: input.pageName,
        channel: input.channel ?? 'messenger',
      },
    });
  }

  async disablePage(subAccountId: string, pageId: string) {
    const page = await this.prisma.messengerPage.findUnique({ where: { pageId } });
    if (!page || page.subAccountId !== subAccountId) throw new NotFoundException('Página não encontrada');
    return this.prisma.messengerPage.update({ where: { pageId }, data: { enabled: false } });
  }

  // ---- Inbox ----

  /** Lista conversas acessíveis ao usuário (mais recentes primeiro). */
  async listConversations(user: Caller, subAccountId?: string) {
    const subIds = await this.accessibleSubIds(user);
    if (subIds.length === 0) return [];
    const scoped = subAccountId && subIds.includes(subAccountId) ? [subAccountId] : subIds;

    return this.prisma.messengerConversation.findMany({
      where: { subAccountId: { in: scoped } },
      orderBy: { lastMessageAt: 'desc' },
      take: 200,
      include: {
        subAccount: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, status: true } },
      },
    });
  }

  private async assertConversationAccess(user: Caller, conversationId: string) {
    const conv = await this.prisma.messengerConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('Conversa não encontrada');
    const subIds = await this.accessibleSubIds(user);
    if (!subIds.includes(conv.subAccountId)) throw new ForbiddenException('Sem acesso a esta conversa');
    return conv;
  }

  async getMessages(user: Caller, conversationId: string) {
    const conv = await this.assertConversationAccess(user, conversationId);
    const messages = await this.prisma.messengerMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 500,
      include: { senderUser: { select: { id: true, fullName: true } } },
    });
    const windowOpen = !!conv.lastInboundAt && Date.now() - conv.lastInboundAt.getTime() < MESSAGING_WINDOW_MS;
    // Abrir a conversa marca o lead vinculado como tratado (sai das pendências).
    if (conv.leadId) await this.markLeadContacted(conv.leadId);
    return { conversation: conv, messages, windowOpen };
  }

  /**
   * Resolve um Page Access Token válido: usa o salvo se não estiver vazio; senão
   * deriva um fresco do user token e cacheia. Evita o bug de token vazio/expirado.
   */
  private async resolvePageToken(subAccountId: string, pageId: string): Promise<string> {
    const creds = await this.integrations.getDecrypted<{
      pageAccessToken?: string;
      userAccessToken?: string;
      pageId?: string;
    }>(subAccountId, 'meta_ads');
    if (creds?.pageAccessToken && creds.pageAccessToken.length > 20) return creds.pageAccessToken;
    if (!creds?.userAccessToken) throw new BadRequestException('Meta não conectado nesta conta');

    const client = new MetaGraphClient({
      accessToken: creds.userAccessToken,
      graphVersion: env.META_GRAPH_VERSION,
    });
    let pageToken: string | null = null;
    try {
      pageToken = await client.getPageToken(pageId);
    } catch {
      throw new BadRequestException('Reconecte a Meta desta conta (token expirado)');
    }
    if (!pageToken) throw new BadRequestException('Sem acesso à página — reconecte a Meta');

    // Cacheia o page token pra próximos envios.
    await this.integrations.upsertCredentials(subAccountId, 'meta_ads', {
      ...creds,
      pageAccessToken: pageToken,
      pageId,
    });
    return pageToken;
  }

  /** Converte o erro cru da Send API do Facebook numa mensagem útil. */
  private mapSendError(err: unknown): BadRequestException {
    const fb = (err as { response?: { data?: { error?: { message?: string; code?: number; error_subcode?: number } } } })
      ?.response?.data?.error;
    if (fb?.code === 551 || fb?.error_subcode === 1545041) {
      return new BadRequestException(
        'Não foi possível enviar: em modo de desenvolvimento o Facebook só permite responder testadores do app. Para responder clientes reais é preciso o App Review do pages_messaging + app em Live.',
      );
    }
    if (fb?.code === 190) {
      return new BadRequestException('Token da página inválido — reconecte a Meta desta conta.');
    }
    if (fb?.code === 10 || fb?.error_subcode === 2018278) {
      return new BadRequestException('Fora da janela de 24h do Messenger — o cliente precisa enviar uma nova mensagem.');
    }
    return new BadRequestException(fb?.message ? `Facebook recusou o envio: ${fb.message}` : 'Falha ao enviar a mensagem.');
  }

  private async markLeadContacted(leadId: string) {
    await this.prisma.lead.updateMany({
      where: { id: leadId, status: 'new' },
      data: { status: 'contacted', firstContactAt: new Date() },
    });
  }

  /** Responde uma conversa via Send API (respeitando a janela de 24h). */
  async sendMessage(user: Caller, conversationId: string, text: string) {
    const conv = await this.assertConversationAccess(user, conversationId);

    const windowOpen =
      !!conv.lastInboundAt && Date.now() - conv.lastInboundAt.getTime() < MESSAGING_WINDOW_MS;
    if (!windowOpen) {
      // Fora das 24h só com message tags aprovadas — bloqueia por ora.
      throw new BadRequestException('messaging_window_closed');
    }

    const pageToken = await this.resolvePageToken(conv.subAccountId, conv.pageId);
    const client = new MetaGraphClient({ accessToken: pageToken, graphVersion: env.META_GRAPH_VERSION });

    let res: { message_id?: string };
    try {
      res = await client.sendMessengerText(conv.pageId, pageToken, conv.psid, text);
    } catch (err) {
      throw this.mapSendError(err);
    }

    const now = new Date();
    const message = await this.prisma.messengerMessage.create({
      data: {
        conversationId: conv.id,
        mid: res.message_id ?? undefined,
        direction: 'outbound',
        text,
        senderUserId: user.id,
        createdAt: now,
      },
    });
    await this.prisma.messengerConversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: now, lastMessageText: text.slice(0, 200) },
    });
    if (conv.leadId) await this.markLeadContacted(conv.leadId);

    return message;
  }
}
