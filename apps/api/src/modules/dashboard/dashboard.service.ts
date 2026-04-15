import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(subAccountId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [leadsToday, callsTodayAgg, missedCalls] = await Promise.all([
      this.prisma.lead.count({
        where: { subAccountId, createdAt: { gte: startOfDay }, deletedAt: null },
      }),
      this.prisma.interaction.aggregate({
        where: {
          subAccountId,
          type: 'call',
          startedAt: { gte: startOfDay },
        },
        _count: { _all: true },
        _avg: { durationSeconds: true },
      }),
      this.prisma.interaction.count({
        where: {
          subAccountId,
          type: 'call',
          status: 'missed',
          startedAt: { gte: startOfDay },
        },
      }),
    ]);

    return {
      leadsToday,
      callsToday: callsTodayAgg._count._all,
      missedCalls,
      avgHandleTime: Math.round(callsTodayAgg._avg.durationSeconds ?? 0),
    };
  }
}
