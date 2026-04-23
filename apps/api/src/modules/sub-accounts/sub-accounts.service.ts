import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SubAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  list(agencyId: string) {
    return this.prisma.subAccount.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll() {
    return this.prisma.subAccount.findMany({
      orderBy: { createdAt: 'desc' },
      include: { agency: { select: { id: true, name: true } } },
    });
  }

  /** Subcontas acessíveis pelo usuário (via memberships diretas + via agency_admin). */
  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { agencyId: true, subAccountId: true, role: true },
    });

    const directIds = memberships.map((m) => m.subAccountId).filter((v): v is string => !!v);
    const agencyIds = memberships
      .filter((m) => m.role === 'agency_admin' || m.role === 'super_admin')
      .map((m) => m.agencyId)
      .filter((v): v is string => !!v);

    return this.prisma.subAccount.findMany({
      where: {
        OR: [
          ...(directIds.length ? [{ id: { in: directIds } }] : []),
          ...(agencyIds.length ? [{ agencyId: { in: agencyIds } }] : []),
        ],
        status: { not: 'archived' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        agencyId: true,
        plan: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  get(id: string) {
    return this.prisma.subAccount.findUnique({
      where: { id },
      include: {
        phoneNumbers: { where: { status: 'active' }, orderBy: { createdAt: 'desc' } },
        _count: { select: { leads: true, interactions: true } },
      },
    });
  }

  create(agencyId: string, input: { name: string; slug: string }) {
    return this.prisma.subAccount.create({
      data: {
        agencyId,
        name: input.name,
        slug: input.slug,
        cloudtalkTag: `sub:${randomUUID()}`,
      },
    });
  }

  update(id: string, input: { name?: string; status?: 'active' | 'paused' | 'archived'; plan?: 'starter' | 'pro' | 'enterprise' }) {
    return this.prisma.subAccount.update({ where: { id }, data: input });
  }
}
