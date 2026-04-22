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
      series,
      topAgents,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: { subAccountId, createdAt: { gte: startOfDay }, deletedAt: null },
      }),
      this.prisma.interaction.aggregate({
        where: { subAccountId, type: 'call', startedAt: { gte: startOfDay } },
        _count: { _all: true },
        _avg: { durationSeconds: true },
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
      this.callsSeries(subAccountId),
      this.topAgents(subAccountId, startOfWeek),
    ]);

    return {
      leadsToday,
      callsToday: callsTodayAgg._count._all,
      missedCalls,
      avgHandleTime: Math.round(callsTodayAgg._avg.durationSeconds ?? 0),
      totalTalkToday: callsTodayAgg._sum.durationSeconds ?? 0,
      callsWeek,
      leadsWeek,
      wonWeek,
      conversionRate: leadsWeek > 0 ? Math.round((wonWeek / leadsWeek) * 100) : 0,
      series,
      topAgents,
    };
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

  async agencyStats(agencyId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const subs = await this.prisma.subAccount.findMany({
      where: { agencyId, status: { not: 'archived' } },
      select: { id: true, name: true },
    });
    const subIds = subs.map((s) => s.id);
    if (subIds.length === 0) {
      return {
        totalClients: 0,
        totalLeadsToday: 0,
        totalCallsToday: 0,
        totalMissedToday: 0,
        totalLeadsWeek: 0,
        totalCallsWeek: 0,
        totalTalkTodaySeconds: 0,
        topClients: [],
        series: [],
      };
    }

    const [leadsToday, callsTodayAgg, missedToday, callsWeek, leadsWeek, topClients, series] =
      await Promise.all([
        this.prisma.lead.count({
          where: { subAccountId: { in: subIds }, createdAt: { gte: startOfDay }, deletedAt: null },
        }),
        this.prisma.interaction.aggregate({
          where: { subAccountId: { in: subIds }, type: 'call', startedAt: { gte: startOfDay } },
          _count: { _all: true },
          _sum: { durationSeconds: true },
        }),
        this.prisma.interaction.count({
          where: {
            subAccountId: { in: subIds },
            type: 'call',
            status: 'missed',
            startedAt: { gte: startOfDay },
          },
        }),
        this.prisma.interaction.count({
          where: { subAccountId: { in: subIds }, type: 'call', startedAt: { gte: startOfWeek } },
        }),
        this.prisma.lead.count({
          where: { subAccountId: { in: subIds }, createdAt: { gte: startOfWeek }, deletedAt: null },
        }),
        this.topClients(subIds, startOfWeek),
        this.agencyCallsSeries(subIds),
      ]);

    return {
      totalClients: subs.length,
      totalLeadsToday: leadsToday,
      totalCallsToday: callsTodayAgg._count._all,
      totalMissedToday: missedToday,
      totalLeadsWeek: leadsWeek,
      totalCallsWeek: callsWeek,
      totalTalkTodaySeconds: callsTodayAgg._sum.durationSeconds ?? 0,
      topClients,
      series,
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

  private async agencyCallsSeries(subIds: string[]) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', started_at) AS day, COUNT(*)::bigint AS count
      FROM interactions
      WHERE sub_account_id = ANY(${subIds}::uuid[])
        AND type = 'call'
        AND started_at >= ${sevenDaysAgo}
      GROUP BY 1
      ORDER BY 1
    `;
    return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), count: Number(r.count) }));
  }
}
