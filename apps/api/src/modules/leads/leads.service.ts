import { Injectable } from '@nestjs/common';
import { Prisma } from '@callwe/db';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LeadSource, LeadStatus } from '@callwe/db';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  list(subAccountId: string, filters?: { status?: LeadStatus; search?: string }) {
    return this.prisma.lead.findMany({
      where: {
        subAccountId,
        deletedAt: null,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { phoneE164: { contains: filters.search } },
                { email: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  get(subAccountId: string, id: string) {
    return this.prisma.lead.findFirst({
      where: { id, subAccountId },
      include: {
        interactions: { orderBy: { startedAt: 'desc' } },
        notes: { orderBy: { createdAt: 'desc' } },
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

  async upsertByPhone(
    subAccountId: string,
    phoneE164: string,
    defaults: { source: LeadSource; name?: string },
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

  async addNote(leadId: string, authorUserId: string, body: string) {
    return this.prisma.leadNote.create({
      data: { leadId, authorUserId, body },
    });
  }
}
