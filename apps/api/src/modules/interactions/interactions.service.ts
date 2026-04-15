import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class InteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(subAccountId: string, filters?: { type?: string; from?: Date; to?: Date }) {
    return this.prisma.interaction.findMany({
      where: {
        subAccountId,
        ...(filters?.type ? { type: filters.type as never } : {}),
        ...(filters?.from || filters?.to
          ? { startedAt: { gte: filters.from, lte: filters.to } }
          : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: 200,
      include: { lead: true, agent: { select: { id: true, fullName: true } } },
    });
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
