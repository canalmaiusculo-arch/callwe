import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(subAccountId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const [
      leadsToday,
      callsTodayAgg,
      missedCalls,
      callsWeek,
      leadsWeek,
      wonWeek,
      qualifiedWeek,
      lostWeek,
      inboundWeek,
      outboundWeek,
      coldCallsWeek,
      followupCallsWeek,
      series,
      hourlySeries,
      topAgents,
      statusBreakdown,
      recentLeads,
      recentCalls,
      missedList,
      longestCall,
      leadsBySourceRows,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: { subAccountId, createdAt: { gte: startOfDay }, deletedAt: null },
      }),
      this.prisma.interaction.aggregate({
        where: { subAccountId, type: 'call', startedAt: { gte: startOfDay } },
        _count: { _all: true },
        _avg: { durationSeconds: true, waitingSeconds: true },
        _sum: { durationSeconds: true },
      }),
      this.prisma.interaction.count({
        where: { subAccountId, type: 'call', status: 'missed', startedAt: { gte: startOfDay } },
      }),
      this.prisma.interaction.count({
        where: { subAccountId, type: 'call', startedAt: { gte: startOfWeek } },
      }),
      this.prisma.lead.count({
        where: { subAccountId, createdAt: { gte: startOfWeek }, deletedAt: null },
      }),
      this.prisma.lead.count({
        where: { subAccountId, status: 'won', createdAt: { gte: startOfWeek }, deletedAt: null },
      }),
      this.prisma.lead.count({
        where: {
          subAccountId,
          status: { in: ['qualified', 'won'] },
          createdAt: { gte: startOfWeek },
          deletedAt: null,
        },
      }),
      this.prisma.lead.count({
        where: { subAccountId, status: 'lost', createdAt: { gte: startOfWeek }, deletedAt: null },
      }),
      this.prisma.interaction.count({
        where: { subAccountId, type: 'call', direction: 'inbound', startedAt: { gte: startOfWeek } },
      }),
      this.prisma.interaction.count({
        where: { subAccountId, type: 'call', direction: 'outbound', startedAt: { gte: startOfWeek } },
      }),
      this.coldCallsCount(subAccountId, startOfWeek),
      this.followupCallsCount(subAccountId, startOfWeek),
      this.callsSeries(subAccountId),
      this.hourlySeries(subAccountId, startOfWeek),
      this.topAgents(subAccountId, startOfWeek),
      this.leadStatusBreakdown(subAccountId),
      this.prisma.lead.findMany({
        where: { subAccountId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { name: true, phoneE164: true, source: true, status: true, createdAt: true },
      }),
      this.prisma.interaction.findMany({
        where: { subAccountId, type: 'call', startedAt: { gte: startOfWeek } },
        orderBy: { startedAt: 'desc' },
        take: 8,
        select: {
          startedAt: true,
          direction: true,
          status: true,
          durationSeconds: true,
          fromNumber: true,
          toNumber: true,
          aiSummary: true,
          sentiment: true,
          aiScore: true,
          lead: { select: { name: true } },
        },
      }),
      this.prisma.interaction.findMany({
        where: { subAccountId, type: 'call', status: 'missed', startedAt: { gte: startOfWeek } },
        orderBy: { startedAt: 'desc' },
        take: 8,
        select: {
          startedAt: true,
          direction: true,
          fromNumber: true,
          toNumber: true,
          lead: { select: { name: true } },
        },
      }),
      this.prisma.interaction.findFirst({
        where: { subAccountId, type: 'call', startedAt: { gte: startOfWeek }, durationSeconds: { not: null } },
        orderBy: { durationSeconds: 'desc' },
        select: { durationSeconds: true, fromNumber: true, toNumber: true, lead: { select: { name: true } } },
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { subAccountId, deletedAt: null, createdAt: { gte: startOfWeek } },
        _count: { _all: true },
      }),
    ]);

    const avgWait = Math.round(callsTodayAgg._avg.waitingSeconds ?? 0);
    const avgHandle = Math.round(callsTodayAgg._avg.durationSeconds ?? 0);

    return {
      leadsToday,
      callsToday: callsTodayAgg._count._all,
      missedCalls,
      avgHandleTime: avgHandle,
      avgWaitingTime: avgWait,
      totalTalkToday: callsTodayAgg._sum.durationSeconds ?? 0,
      callsWeek,
      inboundWeek,
      outboundWeek,
      coldCallsWeek,
      followupCallsWeek,
      leadsWeek,
      wonWeek,
      qualifiedWeek,
      lostWeek,
      conversionRateQualified:
        leadsWeek > 0 ? Math.round((qualifiedWeek / leadsWeek) * 100) : 0,
      conversionRateWon: leadsWeek > 0 ? Math.round((wonWeek / leadsWeek) * 100) : 0,
      winRate: qualifiedWeek > 0 ? Math.round((wonWeek / qualifiedWeek) * 100) : 0,
      series,
      hourlySeries,
      topAgents,
      statusBreakdown,
      leadsBySource: leadsBySourceRows
        .map((r) => ({ source: r.source as string, count: r._count._all }))
        .sort((a, b) => b.count - a.count),
      details: {
        recentLeads: recentLeads.map((l) => ({
          name: l.name ?? l.phoneE164 ?? '—',
          source: l.source as string,
          status: l.status as string,
          at: l.createdAt.toISOString(),
        })),
        recentCalls: recentCalls.map((c) => ({
          at: c.startedAt.toISOString(),
          direction: c.direction as string,
          status: c.status as string,
          durationSeconds: c.durationSeconds ?? 0,
          number: (c.direction === 'inbound' ? c.fromNumber : c.toNumber) ?? null,
          leadName: c.lead?.name ?? null,
          aiSummary: c.aiSummary ?? null,
          sentiment: (c.sentiment as string | null) ?? null,
          aiScore: c.aiScore ?? null,
        })),
        missed: missedList.map((m) => ({
          at: m.startedAt.toISOString(),
          number: (m.direction === 'inbound' ? m.fromNumber : m.toNumber) ?? m.fromNumber ?? null,
          leadName: m.lead?.name ?? null,
        })),
        talk: {
          avgSeconds: avgHandle,
          longest: longestCall
            ? { seconds: longestCall.durationSeconds ?? 0, leadName: longestCall.lead?.name ?? null }
            : null,
        },
      },
    };
  }

  /** Chamadas frias: outbound pra lead status=new (nunca tinha sido contatado antes). */
  private async coldCallsCount(subAccountId: string, since: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM interactions i
      JOIN leads l ON l.id = i.lead_id
      WHERE i.sub_account_id = ${subAccountId}::uuid
        AND i.type = 'call'
        AND i.direction = 'outbound'
        AND i.started_at >= ${since}
        AND l.status = 'new'
    `;
    return Number(rows[0]?.c ?? 0);
  }

  /** Follow-up: outbound pra lead status in (contacted, qualified). */
  private async followupCallsCount(subAccountId: string, since: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM interactions i
      JOIN leads l ON l.id = i.lead_id
      WHERE i.sub_account_id = ${subAccountId}::uuid
        AND i.type = 'call'
        AND i.direction = 'outbound'
        AND i.started_at >= ${since}
        AND l.status IN ('contacted', 'qualified')
    `;
    return Number(rows[0]?.c ?? 0);
  }

  /** Volume por hora do dia nos últimos 7d. */
  private async hourlySeries(subAccountId: string, since: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT EXTRACT(HOUR FROM started_at)::int AS hour, COUNT(*)::bigint AS count
      FROM interactions
      WHERE sub_account_id = ${subAccountId}::uuid
        AND type = 'call'
        AND started_at >= ${since}
      GROUP BY 1
      ORDER BY 1
    `;
    // Preenche buracos
    const map = new Map(rows.map((r) => [Number(r.hour), Number(r.count)]));
    return Array.from({ length: 24 }, (_, h) => ({ hour: h, count: map.get(h) ?? 0 }));
  }

  private async leadStatusBreakdown(subAccountId: string) {
    const rows = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { subAccountId, deletedAt: null },
      _count: { _all: true },
    });
    const total = rows.reduce((s, r) => s + r._count._all, 0);
    return rows.map((r) => ({
      status: r.status,
      count: r._count._all,
      percent: total > 0 ? Math.round((r._count._all / total) * 100) : 0,
    }));
  }

  /** Série de chamadas dos últimos 7 dias, 1 bucket por dia. */
  private async callsSeries(subAccountId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', started_at) AS day, COUNT(*)::bigint AS count
      FROM interactions
      WHERE sub_account_id = ${subAccountId}::uuid
        AND type = 'call'
        AND started_at >= ${sevenDaysAgo}
      GROUP BY 1
      ORDER BY 1
    `;
    return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), count: Number(r.count) }));
  }

  private async topAgents(subAccountId: string, since: Date) {
    const rows = await this.prisma.interaction.groupBy({
      by: ['agentUserId'],
      where: {
        subAccountId,
        type: 'call',
        startedAt: { gte: since },
        agentUserId: { not: null },
      },
      _count: { _all: true },
      _sum: { durationSeconds: true },
      orderBy: { _count: { agentUserId: 'desc' } },
      take: 5,
    });
    if (rows.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.agentUserId!).filter(Boolean) } },
      select: { id: true, fullName: true },
    });
    const map = new Map(users.map((u) => [u.id, u.fullName]));
    return rows.map((r) => ({
      userId: r.agentUserId,
      name: map.get(r.agentUserId!) ?? '—',
      calls: r._count._all,
      talkTime: r._sum.durationSeconds ?? 0,
    }));
  }

  async agencyStats(
    agencyId: string,
    opts: { period?: 'today' | '7d' | '30d'; subAccountId?: string } = {},
  ) {
    const period = opts.period ?? '7d';
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const lenDays = period === 'today' ? 1 : period === '30d' ? 30 : 7;
    const from = new Date(startOfDay);
    from.setDate(from.getDate() - (lenDays - 1));
    // Período anterior — mesma duração, imediatamente antes de `from`.
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - lenDays);

    const subs = await this.prisma.subAccount.findMany({
      where: { agencyId, status: { not: 'archived' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const allSubIds = subs.map((s) => s.id);
    const clients = subs.map((s) => ({ id: s.id, name: s.name }));

    // Filtro por cliente — só aplica se o id pertence à agência.
    const subIds =
      opts.subAccountId && allSubIds.includes(opts.subAccountId)
        ? [opts.subAccountId]
        : allSubIds;

    const emptyDetails = {
      missed: [] as Array<{ at: string; client: string; number: string | null }>,
      calls: {
        inbound: 0,
        outbound: 0,
        recent: [] as Array<{
          at: string;
          client: string;
          direction: string;
          status: string;
          durationSeconds: number;
          number: string | null;
        }>,
      },
      leads: [] as Array<{ at: string; client: string; name: string; source: string }>,
      talk: { avgSeconds: 0, longest: null as { seconds: number; client: string } | null },
    };

    if (subIds.length === 0) {
      return {
        period,
        totalClients: subs.length,
        leads: 0,
        calls: 0,
        missed: 0,
        talkSeconds: 0,
        prev: { leads: 0, calls: 0, missed: 0, talkSeconds: 0 },
        leadsBySource: [] as Array<{ source: string; count: number }>,
        details: emptyDetails,
        topClients: [],
        series: [],
        clients,
      };
    }

    const nameOf = new Map(subs.map((s) => [s.id, s.name]));
    const extNumber = (r: { direction: string; fromNumber: string | null; toNumber: string | null }) =>
      (r.direction === 'inbound' ? r.fromNumber : r.toNumber) ?? null;

    const [cur, prev, missedRows, dirRows, callRows, leadRows, sourceRows, longestRow, topClients, series] =
      await Promise.all([
        this.windowAggregates(subIds, from),
        this.windowAggregates(subIds, prevFrom, from),
        this.prisma.interaction.findMany({
          where: { subAccountId: { in: subIds }, type: 'call', status: 'missed', startedAt: { gte: from } },
          orderBy: { startedAt: 'desc' },
          take: 10,
          select: { startedAt: true, direction: true, fromNumber: true, toNumber: true, subAccountId: true },
        }),
        this.prisma.interaction.groupBy({
          by: ['direction'],
          where: { subAccountId: { in: subIds }, type: 'call', startedAt: { gte: from } },
          _count: { _all: true },
        }),
        this.prisma.interaction.findMany({
          where: { subAccountId: { in: subIds }, type: 'call', startedAt: { gte: from } },
          orderBy: { startedAt: 'desc' },
          take: 10,
          select: {
            startedAt: true,
            direction: true,
            status: true,
            durationSeconds: true,
            fromNumber: true,
            toNumber: true,
            subAccountId: true,
          },
        }),
        this.prisma.lead.findMany({
          where: { subAccountId: { in: subIds }, createdAt: { gte: from }, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { name: true, source: true, createdAt: true, subAccountId: true, phoneE164: true },
        }),
        this.prisma.lead.groupBy({
          by: ['source'],
          where: { subAccountId: { in: subIds }, createdAt: { gte: from }, deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.interaction.findFirst({
          where: {
            subAccountId: { in: subIds },
            type: 'call',
            startedAt: { gte: from },
            durationSeconds: { not: null },
          },
          orderBy: { durationSeconds: 'desc' },
          select: { durationSeconds: true, subAccountId: true },
        }),
        this.topClients(subIds, from),
        this.agencyCallsSeries(subIds, from),
      ]);

    const details = {
      missed: missedRows.map((r) => ({
        at: r.startedAt.toISOString(),
        client: nameOf.get(r.subAccountId) ?? '—',
        number: extNumber(r),
      })),
      calls: {
        inbound: dirRows.find((d) => d.direction === 'inbound')?._count._all ?? 0,
        outbound: dirRows.find((d) => d.direction === 'outbound')?._count._all ?? 0,
        recent: callRows.map((r) => ({
          at: r.startedAt.toISOString(),
          client: nameOf.get(r.subAccountId) ?? '—',
          direction: r.direction,
          status: r.status,
          durationSeconds: r.durationSeconds ?? 0,
          number: extNumber(r),
        })),
      },
      leads: leadRows.map((r) => ({
        at: r.createdAt.toISOString(),
        client: nameOf.get(r.subAccountId) ?? '—',
        name: r.name ?? r.phoneE164 ?? '—',
        source: r.source,
      })),
      talk: {
        avgSeconds: cur.calls > 0 ? Math.round(cur.talkSeconds / cur.calls) : 0,
        longest: longestRow
          ? { seconds: longestRow.durationSeconds ?? 0, client: nameOf.get(longestRow.subAccountId) ?? '—' }
          : null,
      },
    };

    const leadsBySource = sourceRows
      .map((r) => ({ source: r.source as string, count: r._count._all }))
      .sort((a, b) => b.count - a.count);

    return {
      period,
      totalClients: subs.length,
      leads: cur.leads,
      calls: cur.calls,
      missed: cur.missed,
      talkSeconds: cur.talkSeconds,
      prev: { leads: prev.leads, calls: prev.calls, missed: prev.missed, talkSeconds: prev.talkSeconds },
      leadsBySource,
      details,
      topClients,
      series,
      clients,
    };
  }

  /** Agregados de chamadas/leads numa janela [from, to). `to` omitido = até agora. */
  private async windowAggregates(subIds: string[], from: Date, to?: Date) {
    const startedAt = to ? { gte: from, lt: to } : { gte: from };
    const createdAt = to ? { gte: from, lt: to } : { gte: from };
    const [leads, callsAgg, missed] = await Promise.all([
      this.prisma.lead.count({ where: { subAccountId: { in: subIds }, createdAt, deletedAt: null } }),
      this.prisma.interaction.aggregate({
        where: { subAccountId: { in: subIds }, type: 'call', startedAt },
        _count: { _all: true },
        _sum: { durationSeconds: true },
      }),
      this.prisma.interaction.count({
        where: { subAccountId: { in: subIds }, type: 'call', status: 'missed', startedAt },
      }),
    ]);
    return {
      leads,
      calls: callsAgg._count._all,
      missed,
      talkSeconds: callsAgg._sum.durationSeconds ?? 0,
    };
  }

  private async topClients(subIds: string[], since: Date) {
    const rows = await this.prisma.interaction.groupBy({
      by: ['subAccountId'],
      where: {
        subAccountId: { in: subIds },
        type: 'call',
        startedAt: { gte: since },
      },
      _count: { _all: true },
      orderBy: { _count: { subAccountId: 'desc' } },
      take: 5,
    });
    const subs = await this.prisma.subAccount.findMany({
      where: { id: { in: rows.map((r) => r.subAccountId) } },
      select: { id: true, name: true },
    });
    const map = new Map(subs.map((s) => [s.id, s.name]));
    return rows.map((r) => ({
      subAccountId: r.subAccountId,
      name: map.get(r.subAccountId) ?? '—',
      calls: r._count._all,
    }));
  }

  private async agencyCallsSeries(subIds: string[], from: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', started_at) AS day, COUNT(*)::bigint AS count
      FROM interactions
      WHERE sub_account_id = ANY(${subIds}::uuid[])
        AND type = 'call'
        AND started_at >= ${from}
      GROUP BY 1
      ORDER BY 1
    `;
    const counts = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));

    // Preenche todos os dias do período (de `from` até hoje) com 0 onde não houve chamada.
    const out: Array<{ day: string; count: number }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cursor = new Date(from);
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      out.push({ day: key, count: counts.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }
}
