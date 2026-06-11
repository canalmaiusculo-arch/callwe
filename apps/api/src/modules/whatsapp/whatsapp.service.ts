import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service.js';
import { env } from '../../config/env.js';

interface ZapiGroup {
  phone: string;
  name: string;
  isGroup: boolean;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve as credenciais Z-API: usa o número PRÓPRIO da agência (Agency.settings.zapi)
   * se configurado; senão cai no número global (env). Cada agência usa o próprio número.
   */
  private async resolveCreds(
    agencyId: string | null,
  ): Promise<{ instanceId: string; token: string; clientToken: string }> {
    if (agencyId) {
      const agency = await this.prisma.agency.findUnique({
        where: { id: agencyId },
        select: { settings: true },
      });
      const zapi = ((agency?.settings ?? {}) as Record<string, unknown>).zapi as
        | { instanceId?: string; token?: string; clientToken?: string }
        | undefined;
      if (zapi?.instanceId && zapi?.token && zapi?.clientToken) {
        return { instanceId: zapi.instanceId, token: zapi.token, clientToken: zapi.clientToken };
      }
    }
    if (env.ZAPI_INSTANCE_ID && env.ZAPI_TOKEN && env.ZAPI_CLIENT_TOKEN) {
      return {
        instanceId: env.ZAPI_INSTANCE_ID,
        token: env.ZAPI_TOKEN,
        clientToken: env.ZAPI_CLIENT_TOKEN,
      };
    }
    throw new BadRequestException(
      'Z-API não configurada. Configure o número da agência em Configurações → WhatsApp.',
    );
  }

  private urlFor(c: { instanceId: string; token: string }): string {
    return `https://api.z-api.io/instances/${c.instanceId}/token/${c.token}`;
  }
  private headersFor(c: { clientToken: string }): Record<string, string> {
    return { 'Client-Token': c.clientToken, 'Content-Type': 'application/json' };
  }

  /** Config Z-API da agência (não devolve segredos — só indica o que está setado). */
  async getConfig(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      select: { settings: true },
    });
    const zapi = (((agency?.settings ?? {}) as Record<string, unknown>).zapi ?? {}) as {
      instanceId?: string;
      token?: string;
      clientToken?: string;
    };
    return {
      configured: !!(zapi.instanceId && zapi.token && zapi.clientToken),
      instanceId: zapi.instanceId ?? '',
      hasToken: !!zapi.token,
      hasClientToken: !!zapi.clientToken,
      globalFallback: !!(env.ZAPI_INSTANCE_ID && env.ZAPI_TOKEN && env.ZAPI_CLIENT_TOKEN),
    };
  }

  async setConfig(
    agencyId: string,
    input: { instanceId: string; token: string; clientToken: string },
  ) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      select: { settings: true },
    });
    const settings = (agency?.settings ?? {}) as Record<string, unknown>;
    await this.prisma.agency.update({
      where: { id: agencyId },
      data: {
        settings: {
          ...settings,
          zapi: { instanceId: input.instanceId, token: input.token, clientToken: input.clientToken },
        } as never,
      },
    });
    return { ok: true };
  }

  /** Lista grupos do número Z-API da agência (ou global, fallback). */
  async listGroups(agencyId: string | null): Promise<ZapiGroup[]> {
    const creds = await this.resolveCreds(agencyId);
    try {
      const res = await axios.get<unknown>(`${this.urlFor(creds)}/groups`, {
        headers: this.headersFor(creds),
        timeout: 15_000,
      });
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map((g) => {
        const obj = g as Record<string, unknown>;
        return {
          phone: String(obj.phone ?? obj.id ?? ''),
          name: String(obj.name ?? obj.subject ?? '(sem nome)'),
          isGroup: true,
        };
      });
    } catch (err) {
      this.logger.error(`Z-API listGroups falhou: ${this.formatError(err)}`);
      throw new BadRequestException(`Z-API recusou: ${this.formatError(err)}`);
    }
  }

  private async sendText(
    creds: { instanceId: string; token: string; clientToken: string },
    phone: string,
    message: string,
  ): Promise<void> {
    try {
      await axios.post(
        `${this.urlFor(creds)}/send-text`,
        { phone, message },
        { headers: this.headersFor(creds), timeout: 20_000 },
      );
    } catch (err) {
      this.logger.error(`Z-API send-text falhou (phone=${phone}): ${this.formatError(err)}`);
      throw new BadRequestException(`Z-API recusou o envio: ${this.formatError(err)}`);
    }
  }

  /** Carrega interaction, valida acesso, monta mensagem e envia pelo número Z-API da agência. */
  async sendInteractionSummary(userId: string, interactionId: string): Promise<{ sent: true; phone: string; scenario: string }> {
    const interaction = await this.prisma.interaction.findUnique({
      where: { id: interactionId },
      include: { subAccount: true, lead: true, agent: { select: { fullName: true } } },
    });
    if (!interaction) throw new BadRequestException('Interação não encontrada');

    const membership = await this.prisma.membership.findFirst({
      where: { userId, subAccountId: interaction.subAccountId },
      select: { id: true },
    });
    if (!membership) throw new BadRequestException('Você não atende esse cliente');

    const settings = (interaction.subAccount.settings ?? {}) as Record<string, unknown>;
    const phone = String(settings.whatsappGroupId ?? '').trim();
    if (!phone) {
      throw new BadRequestException(
        'Grupo WhatsApp não configurado pra esse cliente — peça pro admin configurar.',
      );
    }

    const scenario = classifyInteraction(interaction);
    if (scenario === 'unsupported') {
      throw new BadRequestException(
        'Essa chamada não tem report disponível ainda. Aguarde a transcrição completar.',
      );
    }

    const creds = await this.resolveCreds(interaction.subAccount.agencyId);
    const message = buildMessage(scenario, interaction);
    await this.sendText(creds, phone, message);
    return { sent: true, phone, scenario };
  }

  private formatError(err: unknown): string {
    if (err instanceof AxiosError) {
      const data = err.response?.data;
      const status = err.response?.status ?? '???';
      const body = typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data ?? err.message);
      return `HTTP ${status} ${body}`;
    }
    return (err as Error)?.message ?? 'erro desconhecido';
  }
}

type Scenario = 'summary' | 'missed_inbound' | 'outbound_unanswered' | 'unsupported';

interface InteractionForWhatsapp {
  type: string;
  direction: string;
  status: string;
  startedAt: Date;
  durationSeconds: number | null;
  fromNumber: string | null;
  toNumber: string | null;
  aiSummary: string | null;
  subAccount: { name: string };
  lead: { name: string | null; phoneE164: string | null } | null;
  agent: { fullName: string } | null;
}

export function classifyInteraction(i: InteractionForWhatsapp): Scenario {
  if (i.type !== 'call') return 'unsupported';
  const summary = i.aiSummary?.trim();
  if (summary) return 'summary';
  if (i.direction === 'inbound' && i.status === 'missed') return 'missed_inbound';
  if (i.direction === 'outbound' && (!i.durationSeconds || i.durationSeconds < 5)) {
    return 'outbound_unanswered';
  }
  return 'unsupported';
}

function buildMessage(scenario: Scenario, i: InteractionForWhatsapp): string {
  const leadName = i.lead?.name?.trim();
  const leadPhone = i.lead?.phoneE164 ?? (i.direction === 'inbound' ? i.fromNumber : i.toNumber) ?? '—';
  const leadLabel = leadName ? `${leadName} (${leadPhone})` : leadPhone;
  const when = i.startedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const agentName = i.agent?.fullName ?? 'Equipe';
  const sub = i.subAccount.name;

  if (scenario === 'summary') {
    const duration = i.durationSeconds
      ? `${Math.floor(i.durationSeconds / 60)}m${i.durationSeconds % 60}s`
      : '—';
    return [
      `📞 *Resumo de chamada — ${sub}*`,
      ``,
      `*Lead:* ${leadLabel}`,
      `*Atendente:* ${agentName}`,
      `*Quando:* ${when}`,
      `*Duração:* ${duration}`,
      ``,
      i.aiSummary?.trim() ?? '',
    ].join('\n');
  }

  if (scenario === 'missed_inbound') {
    return [
      `📵 *Chamada perdida — ${sub}*`,
      ``,
      `*Lead:* ${leadLabel}`,
      `*Quando:* ${when}`,
      ``,
      `Ligou e a chamada foi perdida. Vamos retornar em breve.`,
    ].join('\n');
  }

  // outbound_unanswered
  return [
    `↩️ *Tentativa de retorno — ${sub}*`,
    ``,
    `*Lead:* ${leadLabel}`,
    `*Atendente:* ${agentName}`,
    `*Quando:* ${when}`,
    ``,
    `Tentamos contato mas não foi atendido. Vamos tentar novamente.`,
  ].join('\n');
}
