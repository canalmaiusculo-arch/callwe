import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
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
        cloudtalkTag: true,
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

  async create(agencyId: string, input: { name: string; slug: string }) {
    // Se slug já existe (mesmo arquivado), sugere variante disponível
    const existing = await this.prisma.subAccount.findFirst({
      where: { agencyId, slug: input.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Já existe um cliente com slug "${input.slug}" nessa agência (status: ${existing.status}). Use um slug diferente.`,
      );
    }
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

  archive(id: string) {
    return this.prisma.subAccount.update({ where: { id }, data: { status: 'archived' } });
  }

  reactivate(id: string) {
    return this.prisma.subAccount.update({ where: { id }, data: { status: 'active' } });
  }

  /** Apaga permanentemente a subconta e TODOS os dados associados (cascade). Irreversível. */
  remove(id: string) {
    return this.prisma.subAccount.delete({ where: { id } });
  }

  /** Garante que o usuário pode gerenciar esta subconta: super_admin, ou agency_admin da agência dona. */
  async assertCanManage(
    user: { memberships: Array<{ role: string; agencyId?: string | null }> },
    id: string,
  ) {
    if (user.memberships.some((m) => m.role === 'super_admin')) return;
    const adminAgencyId = user.memberships.find((m) => m.role === 'agency_admin' && m.agencyId)?.agencyId;
    if (!adminAgencyId) throw new ForbiddenException('Sem permissão');
    const sub = await this.prisma.subAccount.findUnique({ where: { id }, select: { agencyId: true } });
    if (!sub || sub.agencyId !== adminAgencyId) {
      throw new ForbiddenException('Cliente fora da sua agência');
    }
  }

  async getOrCreateZapierApiKey(
    id: string,
  ): Promise<{ apiKey: string; webhookUrl: string; thumbtackUrl: string }> {
    const sub = await this.prisma.subAccount.findUnique({ where: { id }, select: { settings: true } });
    if (!sub) throw new Error('Sub-account não encontrada');
    const settings = (sub.settings ?? {}) as Record<string, unknown>;
    let apiKey = typeof settings.zapierApiKey === 'string' ? settings.zapierApiKey : null;
    if (!apiKey || apiKey.length < 16) {
      apiKey = `zk_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '').slice(0, 8)}`;
      await this.prisma.subAccount.update({
        where: { id },
        data: { settings: { ...settings, zapierApiKey: apiKey } as never },
      });
    }
    return this.webhookUrls(apiKey);
  }

  async rotateZapierApiKey(
    id: string,
  ): Promise<{ apiKey: string; webhookUrl: string; thumbtackUrl: string }> {
    const sub = await this.prisma.subAccount.findUnique({ where: { id }, select: { settings: true } });
    if (!sub) throw new Error('Sub-account não encontrada');
    const settings = (sub.settings ?? {}) as Record<string, unknown>;
    const apiKey = `zk_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await this.prisma.subAccount.update({
      where: { id },
      data: { settings: { ...settings, zapierApiKey: apiKey } as never },
    });
    return this.webhookUrls(apiKey);
  }

  private webhookUrls(apiKey: string): { apiKey: string; webhookUrl: string; thumbtackUrl: string } {
    const apiBase = process.env.API_URL ?? 'https://api.callwe.digital';
    return {
      apiKey,
      webhookUrl: `${apiBase}/api/webhooks/leads`,
      thumbtackUrl: `${apiBase}/api/webhooks/thumbtack/${apiKey}`,
    };
  }

  async setWhatsappGroup(id: string, whatsappGroupId: string | null) {
    const sub = await this.prisma.subAccount.findUnique({ where: { id }, select: { settings: true } });
    if (!sub) throw new Error('Sub-account não encontrada');
    const currentSettings = (sub.settings ?? {}) as Record<string, unknown>;
    const next = whatsappGroupId
      ? { ...currentSettings, whatsappGroupId }
      : Object.fromEntries(Object.entries(currentSettings).filter(([k]) => k !== 'whatsappGroupId'));
    return this.prisma.subAccount.update({
      where: { id },
      data: { settings: next as never },
      select: { id: true, name: true, settings: true },
    });
  }
}
