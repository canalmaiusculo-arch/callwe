import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudtalkService } from '../cloudtalk/cloudtalk.service.js';

@Injectable()
export class InteractionsService {
  private readonly logger = new Logger(InteractionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudtalk: CloudtalkService,
  ) {}

  async sendSms(userId: string, input: { subAccountId: string; toNumber: string; text: string }) {
    if (!input.text.trim()) throw new BadRequestException('Mensagem vazia');
    const e164 = /^\+[1-9]\d{1,14}$/;
    if (!e164.test(input.toNumber)) throw new BadRequestException('Número destino inválido (E.164)');

    const membership = await this.prisma.membership.findFirst({
      where: { userId, subAccountId: input.subAccountId, role: 'agent' },
      select: { cloudtalkAgentId: true },
    });
    if (!membership) throw new NotFoundException('Você não atende essa subconta');
    if (!membership.cloudtalkAgentId) {
      throw new BadRequestException('Atendente sem cloudtalk_agent_id vinculado');
    }

    const agentId = Number(membership.cloudtalkAgentId);
    if (!Number.isFinite(agentId)) {
      throw new BadRequestException('cloudtalk_agent_id inválido');
    }

    try {
      await this.cloudtalk.client.sms.send({
        agent_id: agentId,
        to: input.toNumber,
        text: input.text,
      });
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data;
        this.logger.error(
          `CloudTalk sms/send falhou: ${err.response?.status} ${JSON.stringify(data)}`,
        );
        const message =
          (data && typeof data === 'object' && (data.message || data.error || data.responseData)) ||
          err.message;
        throw new BadRequestException(`CloudTalk recusou o envio: ${JSON.stringify(message)}`);
      }
      throw err;
    }

    // O webhook sms.sent vai chegar em 1-3s e o worker persiste a Interaction.
    // Aqui só retornamos sucesso — frontend invalida o cache e o refetch
    // pega o registro quando ele aparecer.
    return { sent: true };
  }

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
        subAccount: { select: { id: true, name: true } },
      },
    });
  }

  getAny(id: string) {
    return this.prisma.interaction.findUnique({
      where: { id },
      include: {
        lead: true,
        agent: { select: { id: true, fullName: true } },
        subAccount: { select: { id: true, name: true } },
      },
    });
  }

  async logRecordingAccess(interactionId: string, userId: string, ip?: string) {
    return this.prisma.recordingAccessLog.create({
      data: { interactionId, userId, ip },
    });
  }
}
