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

  async agentStats(subAccountIds: string[], agentUserId?: string) {
    const empty = {
      callsToday: 0, callsWeek: 0, missedToday: 0, missedWeek: 0, answerRate: 0,
      inboundWeek: 0, outboundWeek: 0,
      totalTalkTimeToday: 0, talkTimeWeek: 0, avgTalkTime: 0,
      smsToday: 0, leadsToday: 0, leadsWeek: 0, wonWeek: 0, qualifiedWeek: 0, conversionWeek: 0,
      estimatesUpcoming: 0,
      recent: [] as Array<{
        id: string; type: string; direction: string; status: string; startedAt: string;
        number: string | null; client: string | null; leadName: string | null;
      }>,
    };
    if (subAccountIds.length === 0) return empty;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    // Escopo pelas subcontas atendidas; `agentUserId` (opcional) restringe ao próprio atendente.
    const scope = { subAccountId: { in: subAccountIds }, ...(agentUserId ? { agentUserId } : {}) };

    const leadScope = { subAccountId: { in: subAccountIds }, deletedAt: null };

    const [
      callsToday, todayDuration, callsWeek, missedToday, missedWeek, weekDuration, dirWeek,
      smsToday, leadsToday, leadsWeek, wonWeek, qualifiedWeek, estimatesUpcoming, recent,
    ] = await Promise.all([
      this.prisma.interaction.count({ where: { ...scope, type: 'call', startedAt: { gte: startOfDay } } }),
      this.prisma.interaction.aggregate({
        where: { ...scope, type: 'call', startedAt: { gte: startOfDay } },
        _sum: { durationSeconds: true },
        _avg: { durationSeconds: true },
      }),
      this.prisma.interaction.count({ where: { ...scope, type: 'call', startedAt: { gte: startOfWeek } } }),
      this.prisma.interaction.count({ where: { ...scope, type: 'call', status: 'missed', startedAt: { gte: startOfDay } } }),
      this.prisma.interaction.count({ where: { ...scope, type: 'call', status: 'missed', startedAt: { gte: startOfWeek } } }),
      this.prisma.interaction.aggregate({
        where: { ...scope, type: 'call', startedAt: { gte: startOfWeek } },
        _sum: { durationSeconds: true },
      }),
      this.prisma.interaction.groupBy({
        by: ['direction'],
        where: { ...scope, type: 'call', startedAt: { gte: startOfWeek } },
        _count: true,
      }),
      this.prisma.interaction.count({ where: { ...scope, type: 'sms', startedAt: { gte: startOfDay } } }),
      this.prisma.lead.count({ where: { ...leadScope, createdAt: { gte: startOfDay } } }),
      this.prisma.lead.count({ where: { ...leadScope, createdAt: { gte: startOfWeek } } }),
      this.prisma.lead.count({ where: { ...leadScope, status: 'won', updatedAt: { gte: startOfWeek } } }),
      this.prisma.lead.count({ where: { ...leadScope, status: 'qualified', updatedAt: { gte: startOfWeek } } }),
      this.prisma.lead.count({ where: { ...leadScope, scheduledEstimateAt: { gte: startOfDay } } }),
      this.prisma.interaction.findMany({
        where: { ...scope, type: { in: ['call', 'sms'] } },
        orderBy: { startedAt: 'desc' },
        take: 8,
        select: {
          id: true, type: true, direction: true, status: true, startedAt: true,
          fromNumber: true, toNumber: true,
          subAccount: { select: { name: true } },
          lead: { select: { name: true } },
        },
      }),
    ]);

    const inboundWeek = dirWeek.find((d) => d.direction === 'inbound')?._count ?? 0;
    const outboundWeek = dirWeek.find((d) => d.direction === 'outbound')?._count ?? 0;
    const answerRate = callsWeek > 0 ? Math.round(((callsWeek - missedWeek) / callsWeek) * 100) : 0;
    const conversionWeek = leadsWeek > 0 ? Math.round((wonWeek / leadsWeek) * 100) : 0;

    return {
      callsToday,
      callsWeek,
      missedToday,
      missedWeek,
      answerRate,
      inboundWeek,
      outboundWeek,
      totalTalkTimeToday: todayDuration._sum.durationSeconds ?? 0,
      talkTimeWeek: weekDuration._sum.durationSeconds ?? 0,
      avgTalkTime: Math.round(todayDuration._avg.durationSeconds ?? 0),
      smsToday,
      leadsToday,
      leadsWeek,
      wonWeek,
      qualifiedWeek,
      conversionWeek,
      estimatesUpcoming,
      recent: recent.map((r) => ({
        id: r.id,
        type: r.type,
        direction: r.direction,
        status: r.status,
        startedAt: r.startedAt.toISOString(),
        number: (r.direction === 'inbound' ? r.fromNumber : r.toNumber) ?? null,
        client: r.subAccount?.name ?? null,
        leadName: r.lead?.name ?? null,
      })),
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
