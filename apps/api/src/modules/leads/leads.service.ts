import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@callwe/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LeadSource, LeadStatus } from '@callwe/db';
import { CloudtalkService } from '../cloudtalk/cloudtalk.service.js';

interface LeadFilters {
  status?: LeadStatus;
  source?: LeadSource;
  search?: string;
  ownerUserId?: string;
  tags?: string[];
  from?: Date;
  to?: Date;
  limit?: number;
  /** Restringe a uma sub-account específica (usado no /leads/mine do atendente). */
  subAccountId?: string;
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudtalk: CloudtalkService,
  ) {}

  async clickToCall(subAccountId: string, leadId: string, userEmail: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, subAccountId, deletedAt: null },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    if (!lead.phoneE164) throw new BadRequestException('Lead sem telefone');

    const agentsRes = await this.cloudtalk.client.http.get('/agents/index.json', {
      params: { limit: 200 },
    });
    const agents = (agentsRes.data?.responseData?.data ?? []) as Array<{
      Agent: { id: string; email: string };
    }>;
    const match = agents.find(
      (a) => a.Agent.email.toLowerCase() === userEmail.toLowerCase(),
    );
    if (!match) {
      throw new BadRequestException(
        `Atendente ${userEmail} não encontrado no CloudTalk. Cadastre o mesmo email lá.`,
      );
    }

    const res = await this.cloudtalk.client.http.post('/calls/create.json', {
      agent_id: Number(match.Agent.id),
      callee_number: lead.phoneE164,
    });

    return { ok: true, cloudtalkResponse: res.data, agentId: match.Agent.id };
  }

  list(subAccountId: string, filters?: LeadFilters) {
    return this.prisma.lead.findMany({
      where: this.buildWhere(subAccountId, filters),
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 100,
      include: { owner: { select: { id: true, fullName: true } } },
    });
  }

  async exportCsv(subAccountId: string, filters?: LeadFilters) {
    const rows = await this.prisma.lead.findMany({
      where: this.buildWhere(subAccountId, filters),
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: { owner: { select: { fullName: true } } },
    });

    const header = [
      'id',
      'name',
      'phone',
      'email',
      'status',
      'source',
      'tags',
      'owner',
      'created_at',
      'last_contact_at',
    ].join(',');

    const body = rows.map((l) =>
      [
        l.id,
        csvEscape(l.name),
        l.phoneE164 ?? '',
        l.email ?? '',
        l.status,
        l.source,
        csvEscape((l.tags ?? []).join('|')),
        csvEscape(l.owner?.fullName ?? ''),
        l.createdAt.toISOString(),
        l.lastContactAt?.toISOString() ?? '',
      ].join(','),
    );

    return [header, ...body].join('\n');
  }

  private buildWhere(subAccountId: string, filters?: LeadFilters) {
    return {
      subAccountId,
      deletedAt: null,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.source ? { source: filters.source } : {}),
      ...(filters?.ownerUserId ? { ownerUserId: filters.ownerUserId } : {}),
      ...(filters?.tags && filters.tags.length > 0 ? { tags: { hasSome: filters.tags } } : {}),
      ...(filters?.from || filters?.to
        ? { createdAt: { gte: filters.from, lte: filters.to } }
        : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' as const } },
              { phoneE164: { contains: filters.search } },
              { email: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
  }

  get(subAccountId: string, id: string, clientView = false) {
    return this.prisma.lead.findFirst({
      where: { id, subAccountId },
      include: {
        interactions: { orderBy: { startedAt: 'desc' } },
        notes: {
          // Cliente só enxerga as mensagens marcadas como compartilhadas.
          where: clientView ? { shared: true } : undefined,
          include: { author: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  create(
    subAccountId: string,
    input: {
      source: LeadSource;
      sourceRef?: string;
      name?: string;
      phoneE164?: string;
      email?: string;
      customFields?: Prisma.InputJsonValue;
    },
  ) {
    return this.prisma.lead.create({
      data: {
        subAccountId,
        source: input.source,
        sourceRef: input.sourceRef,
        name: input.name,
        phoneE164: input.phoneE164,
        email: input.email,
        customFields: input.customFields ?? {},
      },
    });
  }

  /** Lista leads de múltiplas sub-accounts (pra atendente que atende vários clientes). */
  listMany(subAccountIds: string[], filters?: LeadFilters) {
    // Se veio um cliente específico, restringe a ele — mas só se o atendente
    // realmente atende esse cliente (nunca amplia o acesso).
    const scoped =
      filters?.subAccountId && subAccountIds.includes(filters.subAccountId)
        ? [filters.subAccountId]
        : subAccountIds;

    return this.prisma.lead.findMany({
      where: {
        subAccountId: { in: scoped },
        deletedAt: null,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.source ? { source: filters.source } : {}),
        ...(filters?.ownerUserId ? { ownerUserId: filters.ownerUserId } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { phoneE164: { contains: filters.search } },
                { email: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(filters?.from || filters?.to
          ? { createdAt: { gte: filters.from, lte: filters.to } }
          : {}),
      },
      include: {
        subAccount: { select: { id: true, name: true } },
        owner: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 100,
    });
  }

  async upsertByPhone(
    subAccountId: string,
    phoneE164: string,
    defaults: {
      source: LeadSource;
      sourceRef?: string;
      name?: string;
      email?: string;
      customFields?: Prisma.InputJsonValue;
    },
  ) {
    const existing = await this.prisma.lead.findFirst({
      where: { subAccountId, phoneE164, deletedAt: null },
    });
    if (existing) return existing;
    return this.create(subAccountId, { phoneE164, ...defaults });
  }

  update(
    subAccountId: string,
    id: string,
    input: {
      name?: string;
      email?: string;
      phoneE164?: string;
      status?: LeadStatus;
      lostReason?: string;
      tags?: string[];
      ownerUserId?: string | null;
    },
  ) {
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...input,
        ...(input.status === 'contacted' || input.status === 'qualified'
          ? { lastContactAt: new Date() }
          : {}),
        ...(input.status && !input.tags ? { firstContactAt: new Date() } : {}),
      },
    });
  }

  async addNote(
    leadId: string,
    authorUserId: string,
    body: string,
    opts: { shared: boolean; authorRole?: string },
  ) {
    return this.prisma.leadNote.create({
      data: { leadId, authorUserId, body, shared: opts.shared, authorRole: opts.authorRole ?? null },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }
}

function csvEscape(s: string | null | undefined): string {
  if (!s) return '';
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
