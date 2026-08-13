import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@callwe/db';
import { PrismaService } from '../prisma/prisma.service.js';

// SLA operacional: um caso não resolvido em 7 dias vira "alerta máximo".
const SLA_MS = 7 * 24 * 60 * 60 * 1000;
// Data de lançamento da Gestão Operacional. Leads criados antes disso já existiam
// e não devem nascer "vencidos": o relógio de SLA deles conta a partir daqui.
const SLA_GRANDFATHER_MS = new Date('2026-08-13T00:00:00Z').getTime();

// Início efetivo do SLA de um caso (o mais recente entre criação e lançamento).
function slaStart(createdAt: Date): number {
  return Math.max(createdAt.getTime(), SLA_GRANDFATHER_MS);
}

type Tab = 'open' | 'follow_up' | 'resolved';
type Member = { role: string; agencyId?: string | null; subAccountId?: string | null };
type Caller = { id: string; memberships: Member[] };

interface CaseFilters {
  tab?: Tab;
  origin?: string;
  subAccountId?: string;
  date?: string; // YYYY-MM-DD
  search?: string;
}

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Marca o lead como "tratado" (deixa de ser pendência): avança status new→contacted.
   * Só afeta leads ainda 'new', então nunca rebaixa um lead já trabalhado.
   */
  async markContacted(leadId: string) {
    await this.prisma.lead.updateMany({
      where: { id: leadId, status: 'new' },
      data: { status: 'contacted', firstContactAt: new Date() },
    });
  }

  /**
   * Sub-accounts no escopo do chamador:
   * - agentId (supervisão): as sub-accounts daquele atendente
   * - super_admin: todas (ou de uma agência, se agencyId vier)
   * - agency_admin: as sub-accounts da sua agência
   * - atendente: as que ele atende
   */
  private async scopeSubIds(
    user: Caller,
    opts: { agentId?: string; agencyId?: string } = {},
  ): Promise<string[]> {
    const isSuper = user.memberships.some((m) => m.role === 'super_admin');
    const isAgencyAdmin = user.memberships.some((m) => m.role === 'agency_admin');
    let ids: string[];

    if (opts.agentId && (isSuper || isAgencyAdmin)) {
      const subs = await this.prisma.membership.findMany({
        where: { userId: opts.agentId, role: 'agent' },
        select: { subAccountId: true },
      });
      ids = subs.map((s) => s.subAccountId).filter((v): v is string => !!v);
    } else if (isSuper) {
      const subs = await this.prisma.subAccount.findMany({
        where: opts.agencyId ? { agencyId: opts.agencyId } : {},
        select: { id: true },
      });
      ids = subs.map((s) => s.id);
    } else if (isAgencyAdmin) {
      const agencyIds = user.memberships
        .filter((m) => m.role === 'agency_admin')
        .map((m) => m.agencyId)
        .filter((v): v is string => !!v);
      const subs = await this.prisma.subAccount.findMany({
        where: { agencyId: { in: agencyIds } },
        select: { id: true },
      });
      ids = subs.map((s) => s.id);
    } else {
      ids = user.memberships.map((m) => m.subAccountId).filter((v): v is string => !!v);
    }

    if (ids.length === 0) return ids;
    // Ignora clientes arquivados (ex.: números internos de SDR) no painel.
    const active = await this.prisma.subAccount.findMany({
      where: { id: { in: ids }, status: { not: 'archived' } },
      select: { id: true },
    });
    return active.map((s) => s.id);
  }

  private isOverdue(row: { caseStatus: string; createdAt: Date }): boolean {
    return row.caseStatus !== 'resolved' && Date.now() - slaStart(row.createdAt) > SLA_MS;
  }

  private shapeListItem(l: LeadRow) {
    const cf = (l.customFields ?? {}) as Record<string, unknown>;
    const lastInteraction = l.interactions[0];
    return {
      id: l.id,
      caseStatus: l.caseStatus,
      status: l.status,
      source: l.source,
      name: l.name,
      phoneE164: l.phoneE164,
      email: l.email,
      address: (cf.address as string | undefined) ?? (cf.lsaId as string | undefined) ?? null,
      subAccount: l.subAccount ? { id: l.subAccount.id, name: l.subAccount.name } : null,
      createdAt: l.createdAt,
      followUpAt: l.followUpAt,
      followUpReason: l.followUpReason,
      followUpUser: l.followUpUser ? { id: l.followUpUser.id, fullName: l.followUpUser.fullName } : null,
      resolvedAt: l.resolvedAt,
      resolvedBy: l.resolvedBy ? { id: l.resolvedBy.id, fullName: l.resolvedBy.fullName } : null,
      caseOutcome: l.caseOutcome,
      resolutionNote: l.resolutionNote,
      visitAt: l.visitAt,
      visitConfirmed: l.visitConfirmed,
      interactionsCount: l._count?.interactions ?? 0,
      notesCount: l._count?.notes ?? 0,
      lastInteractionAt: lastInteraction?.startedAt ?? null,
      overdue: this.isOverdue(l),
    };
  }

  /** Lista casos das sub-accounts acessíveis, filtrando por aba/origem/cliente/data. */
  async listMine(user: Caller, filters: CaseFilters, agentId?: string, agencyId?: string) {
    const subIds = await this.scopeSubIds(user, { agentId, agencyId });
    if (subIds.length === 0) return [];

    const where: Prisma.LeadWhereInput = {
      deletedAt: null,
      subAccountId: filters.subAccountId && subIds.includes(filters.subAccountId) ? filters.subAccountId : { in: subIds },
    };
    if (filters.tab) where.caseStatus = filters.tab;
    if (filters.origin && filters.origin !== 'all') {
      where.source = originToSources(filters.origin);
    }
    if (filters.date) {
      const start = new Date(`${filters.date}T00:00:00`);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      where.createdAt = { gte: start, lt: end };
    }
    if (filters.search) {
      const s = filters.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { phoneE164: { contains: s } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    // Abertos primeiro os mais antigos (mais próximos de estourar o SLA); follow-up pela data de retorno.
    const orderBy: Prisma.LeadOrderByWithRelationInput =
      filters.tab === 'follow_up'
        ? { followUpAt: 'asc' }
        : filters.tab === 'resolved'
          ? { resolvedAt: 'desc' }
          : { createdAt: 'asc' };

    const rows = await this.prisma.lead.findMany({
      where,
      orderBy,
      take: 300,
      include: LIST_INCLUDE,
    });
    return rows.map((r) => this.shapeListItem(r as unknown as LeadRow));
  }

  /** Contadores por aba (para os badges) + quantos estão vencidos (SLA). */
  async counts(user: Caller, agentId?: string, agencyId?: string) {
    const subIds = await this.scopeSubIds(user, { agentId, agencyId });
    if (subIds.length === 0) return { open: 0, follow_up: 0, resolved: 0, overdue: 0 };
    const base: Prisma.LeadWhereInput = { deletedAt: null, subAccountId: { in: subIds } };
    // Um caso está vencido quando max(createdAt, grandfather) < cutoff. Como o
    // grandfather é fixo, se ele ainda não passou do cutoff, ninguém está vencido.
    const cutoff = Date.now() - SLA_MS;
    const grandfatherPassed = SLA_GRANDFATHER_MS < cutoff;
    const [open, follow_up, resolved, overdue] = await Promise.all([
      this.prisma.lead.count({ where: { ...base, caseStatus: 'open' } }),
      this.prisma.lead.count({ where: { ...base, caseStatus: 'follow_up' } }),
      this.prisma.lead.count({ where: { ...base, caseStatus: 'resolved' } }),
      grandfatherPassed
        ? this.prisma.lead.count({
            where: { ...base, caseStatus: { not: 'resolved' }, createdAt: { lt: new Date(cutoff) } },
          })
        : Promise.resolve(0),
    ]);
    return { open, follow_up, resolved, overdue };
  }

  /**
   * Contadores de pendências (leads ainda não trabalhados: status='new') por
   * cliente e por canal — usado nos badges da sidebar e das abas do atendente.
   */
  async pendingCounts(user: Caller, agentId?: string, agencyId?: string) {
    const subIds = await this.scopeSubIds(user, { agentId, agencyId });
    const empty = { byClient: {} as Record<string, number>, tabs: { leads: 0, forms: 0, calls: 0, sms: 0, messenger: 0 } };
    if (subIds.length === 0) return empty;

    const rows = await this.prisma.lead.groupBy({
      by: ['subAccountId', 'source'],
      where: { deletedAt: null, subAccountId: { in: subIds }, status: 'new' },
      _count: { _all: true },
    });

    const byClient: Record<string, number> = {};
    const tabs = { leads: 0, forms: 0, calls: 0, sms: 0, messenger: 0 };
    for (const r of rows) {
      const n = r._count._all;
      byClient[r.subAccountId] = (byClient[r.subAccountId] ?? 0) + n;
      tabs.leads += n;
      if (r.source === 'form') tabs.forms += n;
      else if (r.source === 'inbound_call' || r.source === 'outbound_call') tabs.calls += n;
      else if (r.source === 'sms') tabs.sms += n;
      else if (r.source === 'messenger') tabs.messenger += n;
    }
    return { byClient, tabs };
  }

  private async assertAccess(user: Caller, caseId: string, agentId?: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: caseId } });
    if (!lead || lead.deletedAt) throw new NotFoundException('Caso não encontrado');
    const subIds = await this.scopeSubIds(user, { agentId });
    if (!subIds.includes(lead.subAccountId)) throw new ForbiddenException('Sem acesso a este caso');
    return lead;
  }

  /** Ficha completa: contato + histórico de interações + notas + follow-up/resolução. */
  async detail(user: Caller, caseId: string) {
    await this.assertAccess(user, caseId);
    const lead = await this.prisma.lead.findUnique({
      where: { id: caseId },
      include: {
        subAccount: { select: { id: true, name: true } },
        followUpUser: { select: { id: true, fullName: true } },
        resolvedBy: { select: { id: true, fullName: true } },
        interactions: {
          orderBy: { startedAt: 'desc' },
          take: 100,
          select: {
            id: true,
            type: true,
            direction: true,
            status: true,
            startedAt: true,
            durationSeconds: true,
            fromNumber: true,
            toNumber: true,
            smsBody: true,
            recordingUrl: true,
            aiSummary: true,
            agent: { select: { id: true, fullName: true } },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { author: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!lead) throw new NotFoundException('Caso não encontrado');
    // Abrir a ficha conta como "tratado": some da fila de pendências.
    await this.markContacted(caseId);
    const cf = (lead.customFields ?? {}) as Record<string, unknown>;
    return {
      ...this.shapeListItem(lead as unknown as LeadRow),
      address: (cf.address as string | undefined) ?? (cf.lsaId as string | undefined) ?? null,
      interactions: lead.interactions,
      notes: lead.notes.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt,
        author: n.author ? { id: n.author.id, fullName: n.author.fullName } : null,
      })),
    };
  }

  async addNote(user: Caller, caseId: string, body: string) {
    await this.assertAccess(user, caseId);
    const note = await this.prisma.leadNote.create({
      data: { leadId: caseId, authorUserId: user.id, body, shared: false },
      include: { author: { select: { id: true, fullName: true } } },
    });
    await this.prisma.lead.update({ where: { id: caseId }, data: { lastContactAt: new Date() } });
    await this.markContacted(caseId);
    return { id: note.id, body: note.body, createdAt: note.createdAt, author: note.author };
  }

  /** Agenda follow-up (move o caso para a aba "Em follow-up"). */
  async scheduleFollowUp(
    user: Caller,
    caseId: string,
    input: { followUpAt: Date; reason?: string; assignedToId?: string },
  ) {
    await this.assertAccess(user, caseId);
    await this.markContacted(caseId);
    return this.prisma.lead.update({
      where: { id: caseId },
      data: {
        caseStatus: 'follow_up',
        followUpAt: input.followUpAt,
        followUpReason: input.reason ?? null,
        followUpUserId: input.assignedToId ?? null,
        // Ao reagendar um caso resolvido, limpa a resolução.
        resolvedAt: null,
        resolvedByUserId: null,
        caseOutcome: null,
      },
    });
  }

  /** Resolve o caso com um desfecho + nota obrigatória. */
  async resolve(
    user: Caller,
    caseId: string,
    input: {
      outcome: 'booked' | 'won' | 'lost';
      note: string;
      visitAt?: Date;
      visitConfirmed?: boolean;
    },
  ) {
    await this.assertAccess(user, caseId);
    if (input.outcome === 'booked' && !input.visitAt) {
      throw new BadRequestException('Data da visita/reunião é obrigatória para "Cliente marcado"');
    }
    // Espelha o desfecho no status comercial do lead.
    const leadStatus = input.outcome === 'won' ? 'won' : input.outcome === 'lost' ? 'lost' : 'qualified';
    const [lead] = await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id: caseId },
        data: {
          caseStatus: 'resolved',
          caseOutcome: input.outcome,
          resolutionNote: input.note,
          resolvedAt: new Date(),
          resolvedByUserId: user.id,
          status: leadStatus,
          visitAt: input.outcome === 'booked' ? input.visitAt : null,
          visitConfirmed: input.outcome === 'booked' ? input.visitConfirmed ?? false : false,
        },
      }),
      // Registra a nota da resolução no histórico de notas também.
      this.prisma.leadNote.create({
        data: {
          leadId: caseId,
          authorUserId: user.id,
          body: `[Resolução: ${outcomeLabel(input.outcome)}] ${input.note}`,
          shared: false,
        },
      }),
    ]);
    return lead;
  }

  /** Reabre um caso resolvido. */
  async reopen(user: Caller, caseId: string) {
    await this.assertAccess(user, caseId);
    return this.prisma.lead.update({
      where: { id: caseId },
      data: { caseStatus: 'open', resolvedAt: null, resolvedByUserId: null, caseOutcome: null },
    });
  }

  /** Abertura manual de um caso (cria um lead). */
  async createManual(
    user: Caller,
    input: {
      subAccountId: string;
      source: string;
      name?: string;
      phoneE164?: string;
      email?: string;
      address?: string;
      note?: string;
    },
  ) {
    const subIds = await this.scopeSubIds(user);
    const isAdmin = user.memberships.some((m) => m.role === 'super_admin' || m.role === 'agency_admin');
    if (!isAdmin && !subIds.includes(input.subAccountId)) {
      throw new ForbiddenException('Sem acesso a este cliente');
    }
    if (!input.name && !input.phoneE164 && !input.email && !input.address) {
      throw new BadRequestException('Informe pelo menos um dado de contato');
    }
    const lead = await this.prisma.lead.create({
      data: {
        subAccountId: input.subAccountId,
        source: input.source as never,
        name: input.name ?? null,
        phoneE164: input.phoneE164 ?? null,
        email: input.email ?? null,
        customFields: input.address ? { address: input.address } : {},
        caseStatus: 'open',
      },
    });
    if (input.note) {
      await this.prisma.leadNote.create({
        data: { leadId: lead.id, authorUserId: user.id, body: input.note, shared: false },
      });
    }
    return lead;
  }
}

// Mapeia o filtro de origem (UI) para os valores de `source` do banco.
function originToSources(origin: string): Prisma.LeadWhereInput['source'] {
  switch (origin) {
    case 'calls':
      return { in: ['inbound_call', 'outbound_call'] } as never;
    case 'sms':
      return { in: ['sms'] } as never;
    case 'meta':
      return { in: ['meta_ads', 'messenger', 'form'] } as never;
    case 'organic':
      return { in: ['manual', 'import', 'api'] } as never;
    default:
      return undefined;
  }
}

function outcomeLabel(o: string): string {
  return o === 'booked' ? 'Cliente marcado' : o === 'won' ? 'Vendido' : 'Perdido';
}

const LIST_INCLUDE = {
  subAccount: { select: { id: true, name: true } },
  followUpUser: { select: { id: true, fullName: true } },
  resolvedBy: { select: { id: true, fullName: true } },
  interactions: { orderBy: { startedAt: 'desc' as const }, take: 1, select: { startedAt: true } },
  _count: { select: { interactions: true, notes: true } },
} satisfies Prisma.LeadInclude;

interface LeadRow {
  id: string;
  caseStatus: string;
  status: string;
  source: string;
  name: string | null;
  phoneE164: string | null;
  email: string | null;
  customFields: unknown;
  createdAt: Date;
  followUpAt: Date | null;
  followUpReason: string | null;
  followUpUser: { id: string; fullName: string } | null;
  resolvedAt: Date | null;
  resolvedBy: { id: string; fullName: string } | null;
  caseOutcome: string | null;
  resolutionNote: string | null;
  visitAt: Date | null;
  visitConfirmed: boolean;
  subAccount: { id: string; name: string } | null;
  interactions: Array<{ startedAt: Date }>;
  _count?: { interactions: number; notes: number };
}
