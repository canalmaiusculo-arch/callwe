import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

type Member = { role: string; agencyId?: string | null; subAccountId?: string | null };
type Caller = { id: string; memberships: Member[] };

const SOURCE_LABEL: Record<string, string> = {
  sms: 'SMS',
  meta_ads: 'Meta',
  form: 'Formulário',
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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

  /** Eventos recentes (últimas 12h) que merecem notificação: novos leads e chamadas perdidas. */
  async recent(user: Caller) {
    const subIds = await this.accessibleSubIds(user);
    if (subIds.length === 0) return [];
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const [leads, missed] = await Promise.all([
      this.prisma.lead.findMany({
        where: {
          subAccountId: { in: subIds },
          deletedAt: null,
          source: { in: ['sms', 'meta_ads', 'form'] },
          createdAt: { gte: since },
        },
        select: {
          id: true,
          name: true,
          phoneE164: true,
          source: true,
          createdAt: true,
          subAccount: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.interaction.findMany({
        where: {
          subAccountId: { in: subIds },
          type: 'call',
          status: 'missed',
          startedAt: { gte: since },
        },
        select: {
          id: true,
          direction: true,
          fromNumber: true,
          toNumber: true,
          startedAt: true,
          subAccount: { select: { name: true } },
          lead: { select: { name: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 20,
      }),
    ]);

    const leadItems = leads.map((l) => ({
      id: `lead:${l.id}`,
      kind: 'lead' as const,
      source: l.source as string,
      title: `Novo lead · ${SOURCE_LABEL[l.source] ?? l.source}`,
      subtitle: `${l.name ?? l.phoneE164 ?? '—'}${l.subAccount?.name ? ` · ${l.subAccount.name}` : ''}`,
      at: l.createdAt.toISOString(),
    }));

    const missedItems = missed.map((m) => ({
      id: `missed:${m.id}`,
      kind: 'missed' as const,
      source: 'missed',
      title: 'Chamada perdida',
      subtitle: `${(m.direction === 'inbound' ? m.fromNumber : m.toNumber) ?? m.lead?.name ?? '—'}${m.subAccount?.name ? ` · ${m.subAccount.name}` : ''}`,
      at: m.startedAt.toISOString(),
    }));

    return [...leadItems, ...missedItems].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
  }
}
