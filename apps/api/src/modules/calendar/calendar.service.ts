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

  /**
   * Estimativas/visitas agendadas no intervalo [from, to], no escopo do usuário.
   *
   * O evento do calendário é a data `scheduledEstimateAt` OU `visitAt` (visita marcada
   * ao resolver um caso como "booked"). A operação real agenda pelos Casos (visitAt),
   * então o calendário precisa considerar as duas datas; usa a que estiver preenchida.
   */
  async listEstimates(
    user: Caller,
    input: { from: Date; to: Date; subAccountId?: string; agentId?: string; agencyId?: string },
  ) {
    const subIds = await this.scopeSubIds(user, { agentId: input.agentId, agencyId: input.agencyId });
    if (subIds.length === 0) return [];

    const range = { gte: input.from, lte: input.to };
    const where: Prisma.LeadWhereInput = {
      deletedAt: null,
      OR: [{ scheduledEstimateAt: range }, { visitAt: range }],
      subAccountId:
        input.subAccountId && subIds.includes(input.subAccountId) ? input.subAccountId : { in: subIds },
    };

    const rows = await this.prisma.lead.findMany({
      where,
      take: 500,
      select: {
        id: true,
        name: true,
        phoneE164: true,
        email: true,
        status: true,
        estimateValue: true,
        scheduledEstimateAt: true,
        visitAt: true,
        visitConfirmed: true,
        caseOutcome: true,
        subAccount: { select: { id: true, name: true } },
      },
    });

    // Data efetiva do evento = estimativa explícita, senão a visita agendada do caso.
    // Mantém o campo `scheduledEstimateAt` na resposta pra o frontend não mudar.
    return rows
      .map(({ visitAt, ...r }) => {
        const effective = r.scheduledEstimateAt ?? visitAt;
        return {
          ...r,
          scheduledEstimateAt: effective,
          isVisit: !r.scheduledEstimateAt && !!visitAt,
        };
      })
      .filter((r) => r.scheduledEstimateAt && r.scheduledEstimateAt >= input.from && r.scheduledEstimateAt <= input.to)
      .sort((a, b) => (a.scheduledEstimateAt!.getTime() - b.scheduledEstimateAt!.getTime()));
  }
}
