import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

type Member = { role: string; agencyId?: string | null; subAccountId?: string | null };
type Caller = { id: string; memberships: Member[] };

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private roleForSub(user: Caller, subAccountId: string): string {
    if (user.memberships.some((m) => m.role === 'super_admin')) return 'super_admin';
    const direct = user.memberships.find((m) => m.subAccountId === subAccountId);
    if (direct) return direct.role;
    if (user.memberships.some((m) => m.role === 'agency_admin')) return 'agency_admin';
    return 'agent';
  }

  private async assertAccess(user: Caller, leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, subAccountId: true },
    });
    if (!lead) throw new NotFoundException('Conversa não encontrada');
    const subIds = await this.accessibleSubIds(user);
    if (!subIds.includes(lead.subAccountId)) throw new ForbiddenException('Sem acesso a esta conversa');
    return lead;
  }

  /** Lista as conversas (leads com mensagens compartilhadas) acessíveis ao usuário. */
  async list(user: Caller) {
    const subIds = await this.accessibleSubIds(user);
    if (subIds.length === 0) return [];

    const notes = await this.prisma.leadNote.findMany({
      where: { shared: true, lead: { subAccountId: { in: subIds }, deletedAt: null } },
      select: {
        leadId: true,
        body: true,
        createdAt: true,
        authorRole: true,
        authorUserId: true,
        lead: {
          select: {
            id: true,
            name: true,
            phoneE164: true,
            subAccountId: true,
            subAccount: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (notes.length === 0) return [];

    const leadIds = [...new Set(notes.map((n) => n.leadId))];
    const reads = await this.prisma.conversationRead.findMany({
      where: { userId: user.id, leadId: { in: leadIds } },
      select: { leadId: true, lastReadAt: true },
    });
    const readMap = new Map(reads.map((r) => [r.leadId, r.lastReadAt]));

    type Conv = {
      leadId: string;
      leadName: string;
      subAccountId: string;
      subAccountName: string;
      lastMessage: { body: string; at: string; authorRole: string | null };
      lastAt: Date;
      unread: number;
    };
    const map = new Map<string, Conv>();
    for (const n of notes) {
      let c = map.get(n.leadId);
      if (!c) {
        c = {
          leadId: n.leadId,
          leadName: n.lead.name ?? n.lead.phoneE164 ?? 'Lead sem nome',
          subAccountId: n.lead.subAccountId,
          subAccountName: n.lead.subAccount?.name ?? '—',
          lastMessage: { body: n.body, at: n.createdAt.toISOString(), authorRole: n.authorRole },
          lastAt: n.createdAt,
          unread: 0,
        };
        map.set(n.leadId, c);
      }
      c.lastMessage = { body: n.body, at: n.createdAt.toISOString(), authorRole: n.authorRole };
      c.lastAt = n.createdAt;
      const lastRead = readMap.get(n.leadId);
      if (n.authorUserId !== user.id && (!lastRead || n.createdAt > lastRead)) c.unread++;
    }

    return [...map.values()]
      .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
      .map(({ lastAt: _lastAt, ...rest }) => rest);
  }

  async messages(user: Caller, leadId: string) {
    await this.assertAccess(user, leadId);
    return this.prisma.leadNote.findMany({
      where: { leadId, shared: true },
      include: { author: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markRead(user: Caller, leadId: string) {
    await this.assertAccess(user, leadId);
    await this.prisma.conversationRead.upsert({
      where: { userId_leadId: { userId: user.id, leadId } },
      create: { userId: user.id, leadId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  async post(user: Caller, leadId: string, body: string) {
    const lead = await this.assertAccess(user, leadId);
    const note = await this.prisma.leadNote.create({
      data: {
        leadId,
        authorUserId: user.id,
        body,
        shared: true,
        authorRole: this.roleForSub(user, lead.subAccountId),
      },
      include: { author: { select: { id: true, fullName: true } } },
    });
    // Quem envia já leu a própria mensagem.
    await this.prisma.conversationRead.upsert({
      where: { userId_leadId: { userId: user.id, leadId } },
      create: { userId: user.id, leadId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    });
    return note;
  }
}
