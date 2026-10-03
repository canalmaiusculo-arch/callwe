import { Injectable } from '@nestjs/common';
import { Prisma } from '@callwe/db';
import { PrismaService } from '../prisma/prisma.service.js';

type Member = { role: string; agencyId?: string | null; subAccountId?: string | null };
type Caller = { id: string; memberships: Member[] };

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sub-accounts visíveis ao chamador (mesma lógica dos casos):
   * super_admin → todas (ou de uma agência); agency_admin → sua agência;
   * agente/cliente → as da sua membership (atendidas / do próprio cliente).
   */
  private async scopeSubIds(
    user: Caller,
    opts: { agentId?: string; agencyId?: string } = {},
  ): Promise<string[]> {
    const isSuper = user.memberships.some((m) => m.role === 'super_admin');
    const isAgencyAdmin = user.memberships.some((m) => m.role === 'agency_admin');

    if (opts.agentId && (isSuper || isAgencyAdmin)) {
      const subs = await this.prisma.membership.findMany({
        where: { userId: opts.agentId, role: 'agent' },
        select: { subAccountId: true },
      });
      return subs.map((s) => s.subAccountId).filter((v): v is string => !!v);
    }
    if (isSuper) {
      const subs = await this.prisma.subAccount.findMany({
        where: opts.agencyId ? { agencyId: opts.agencyId } : {},
        select: { id: true },
      });
      return subs.map((s) => s.id);
    }
    if (isAgencyAdmin) {
      const agencyIds = user.memberships
        .filter((m) => m.role === 'agency_admin')
        .map((m) => m.agencyId)
        .filter((v): v is string => !!v);
      const subs = await this.prisma.subAccount.findMany({
        where: { agencyId: { in: agencyIds } },
        select: { id: true },
      });
      return subs.map((s) => s.id);
    }
    return user.memberships.map((m) => m.subAccountId).filter((v): v is string => !!v);
  }

  /** Estimativas agendadas no intervalo [from, to], no escopo do usuário. */
  async listEstimates(
    user: Caller,
    input: { from: Date; to: Date; subAccountId?: string; agentId?: string; agencyId?: string },
  ) {
    const subIds = await this.scopeSubIds(user, { agentId: input.agentId, agencyId: input.agencyId });
    if (subIds.length === 0) return [];

    const where: Prisma.LeadWhereInput = {
      deletedAt: null,
      scheduledEstimateAt: { gte: input.from, lte: input.to },
      subAccountId:
        input.subAccountId && subIds.includes(input.subAccountId) ? input.subAccountId : { in: subIds },
    };

    const rows = await this.prisma.lead.findMany({
      where,
      orderBy: { scheduledEstimateAt: 'asc' },
      take: 500,
      select: {
        id: true,
        name: true,
        phoneE164: true,
        email: true,
        status: true,
        estimateValue: true,
        scheduledEstimateAt: true,
        subAccount: { select: { id: true, name: true } },
      },
    });
    return rows;
  }
}
