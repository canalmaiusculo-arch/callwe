import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class InteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(
    subAccountIds: string[] | string,
    filters?: { type?: string; from?: Date; to?: Date; agentUserId?: string },
  ) {
    const subAccountId = Array.isArray(subAccountIds) ? { in: subAccountIds } : subAccountIds;
    return this.prisma.interaction.findMany({
      where: {
        subAccountId,
        ...(filters?.type ? { type: filters.type as never } : {}),
        ...(filters?.agentUserId ? { agentUserId: filters.agentUserId } : {}),
        ...(filters?.from || filters?.to
          ? { startedAt: { gte: filters.from, lte: filters.to } }
          : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: 200,
      include: {
        lead: true,
        agent: { select: { id: true, fullName: true } },
        subAccount: { select: { id: true, name: true } },
      },
    });
  }

  async agentStats(agentUserId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const [todayCalls, todayDuration, weekCalls, smsToday] = await Promise.all([
      this.prisma.interaction.count({
        where: { agentUserId, type: 'call', startedAt: { gte: startOfDay } },
      }),
      this.prisma.interaction.aggregate({
        where: { agentUserId, type: 'call', startedAt: { gte: startOfDay } },
        _sum: { durationSeconds: true },
        _avg: { durationSeconds: true },
      }),
      this.prisma.interaction.count({
        where: { agentUserId, type: 'call', startedAt: { gte: startOfWeek } },
      }),
      this.prisma.interaction.count({
        where: { agentUserId, type: 'sms', startedAt: { gte: startOfDay } },
      }),
    ]);

    return {
      callsToday: todayCalls,
      callsWeek: weekCalls,
      totalTalkTimeToday: todayDuration._sum.durationSeconds ?? 0,
      avgTalkTime: Math.round(todayDuration._avg.durationSeconds ?? 0),
      smsToday,
    };
  }

  get(subAccountId: string, id: string) {
    return this.prisma.interaction.findFirst({
      where: { id, subAccountId },
      include: {
        lead: true,
        agent: { select: { id: true, fullName: true } },
        events: { orderBy: { occurredAt: 'asc' } },
      },
    });
  }

  async logRecordingAccess(interactionId: string, userId: string, ip?: string) {
    return this.prisma.recordingAccessLog.create({
      data: { interactionId, userId, ip },
    });
  }
}
