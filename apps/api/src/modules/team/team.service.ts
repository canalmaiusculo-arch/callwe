import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { env } from '../../config/env.js';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista usuários da agência (atendentes + admins). */
  async list(agencyId: string) {
    // Memberships diretas em qualquer subconta da agência OU na própria agência
    const subAccounts = await this.prisma.subAccount.findMany({
      where: { agencyId },
      select: { id: true, name: true, slug: true },
    });
    const subIds = subAccounts.map((s) => s.id);

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { memberships: { some: { agencyId } } },
          { memberships: { some: { subAccountId: { in: subIds } } } },
        ],
      },
      include: {
        memberships: {
          where: {
            OR: [{ agencyId }, { subAccountId: { in: subIds } }],
          },
          include: { subAccount: { select: { id: true, name: true } } },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      memberships: u.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        agencyId: m.agencyId,
        subAccountId: m.subAccountId,
        subAccountName: m.subAccount?.name ?? null,
      })),
    }));
  }

  /** Cria um convite. Role padrão: 'agent'. Se role='client_viewer', user só vê suas subcontas. */
  async invite(
    invoker: { memberships: Array<{ role: string; agencyId?: string | null }> },
    input: { email: string; fullName: string; subAccountIds?: string[]; role?: 'agent' | 'client_viewer' },
  ) {
    // Escopo: agency_admin só pode convidar para subcontas da própria agência.
    const isSuper = invoker.memberships.some((m) => m.role === 'super_admin');
    const agencyId = isSuper
      ? null
      : invoker.memberships.find((m) => m.role === 'agency_admin' && m.agencyId)?.agencyId;
    if (!isSuper && !agencyId) throw new ForbiddenException('Sem permissão');
    if (agencyId && input.subAccountIds?.length) {
      const valid = await this.prisma.subAccount.findMany({
        where: { id: { in: input.subAccountIds }, agencyId },
        select: { id: true },
      });
      if (valid.length !== input.subAccountIds.length) {
        throw new BadRequestException('Há sub-accounts fora da sua agência');
      }
    }

    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('Email já cadastrado no sistema');
    }
    const role = input.role ?? 'agent';

    // Gera token de aceite
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Senha provisória (vai ser trocada no aceite). Argon2id valida no login.
    const tempPassword = randomBytes(16).toString('hex');
    const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash,
        status: 'invited',
        // Guardamos o token + agencyId no campo customFields (jsonb) — simples sem precisar nova tabela
      },
    });

    // Cria session reusada como invite token (expires_at curto)
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      },
    });

    // Cria memberships nas subcontas selecionadas
    if (input.subAccountIds && input.subAccountIds.length > 0) {
      for (const subAccountId of input.subAccountIds) {
        await this.prisma.membership.create({
          data: { userId: user.id, subAccountId, role },
        });
      }
    }

    return {
      userId: user.id,
      email: user.email,
      inviteUrl: `${env.APP_URL}/accept-invite?token=${token}`,
    };
  }

  /** Aceita convite — valida token, define senha real, ativa o usuário. */
  async acceptInvite(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!session) throw new BadRequestException('Convite inválido ou expirado');

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== 'invited') {
      throw new BadRequestException('Convite já foi usado ou usuário inválido');
    }

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, status: 'active' },
    });
    // Revoga o token de convite
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return { ok: true, email: user.email };
  }

  /**
   * Redefine o acesso de um usuário. Se ele ainda não ativou a conta (invited/disabled),
   * gera um novo link de CONVITE. Se já está ativo, gera um link de REDEFINIR SENHA.
   * Retorna a URL para o admin repassar ao cliente (não enviamos e-mail).
   */
  async resetAccess(
    invoker: { memberships: Array<{ role: string; agencyId?: string | null }> },
    targetUserId: string,
  ) {
    const isSuper = invoker.memberships.some((m) => m.role === 'super_admin');
    const agencyId = isSuper
      ? null
      : invoker.memberships.find((m) => m.role === 'agency_admin' && m.agencyId)?.agencyId;
    if (!isSuper && !agencyId) throw new ForbiddenException('Sem permissão');

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Usuário não encontrado');

    if (agencyId) {
      const subIds = (
        await this.prisma.subAccount.findMany({ where: { agencyId }, select: { id: true } })
      ).map((s) => s.id);
      const membership = await this.prisma.membership.findFirst({
        where: { userId: targetUserId, OR: [{ agencyId }, { subAccountId: { in: subIds } }] },
      });
      if (!membership) throw new ForbiddenException('Usuário fora da sua agência');
    }

    // Usuário desativado é reativado como 'invited' (precisa ativar a conta de novo).
    if (target.status === 'disabled') {
      await this.prisma.user.update({ where: { id: targetUserId }, data: { status: 'invited' } });
    }

    const pending = target.status === 'invited' || target.status === 'disabled';
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.session.create({
      data: {
        userId: targetUserId,
        refreshTokenHash: tokenHash,
        expiresAt: new Date(Date.now() + (pending ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000)),
      },
    });

    return pending
      ? { type: 'invite' as const, url: `${env.APP_URL}/accept-invite?token=${token}` }
      : { type: 'reset' as const, url: `${env.APP_URL}/reset-password?token=${token}` };
  }

  /** Lista TODOS os atendentes do sistema (super_admin only). */
  async listAllAgents() {
    const users = await this.prisma.user.findMany({
      where: {
        memberships: { some: { role: { in: ['agent', 'sub_account_admin'] } } },
      },
      include: {
        memberships: {
          where: { role: { in: ['agent', 'sub_account_admin'] } },
          include: { subAccount: { select: { id: true, name: true } } },
        },
      },
      orderBy: { fullName: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      assignedSubAccounts: u.memberships
        .filter((m) => m.subAccount)
        .map((m) => ({ id: m.subAccount!.id, name: m.subAccount!.name })),
    }));
  }

  /** Atualiza o perfil (nome e/ou foto) de um atendente. */
  updateProfile(userId: string, input: { fullName?: string; avatarUrl?: string | null }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      },
      select: { id: true, fullName: true, avatarUrl: true },
    });
  }

  async assignSubAccount(user: { id: string; memberships: Array<{ role: string; agencyId?: string }> }, userId: string, subAccountId: string) {
    await this.requireAgencyAdminOverSubAccount(user, subAccountId);
    const exists = await this.prisma.membership.findFirst({
      where: { userId, subAccountId, role: 'agent' },
    });
    if (exists) return exists;
    return this.prisma.membership.create({
      data: { userId, subAccountId, role: 'agent' },
    });
  }

  async unassignSubAccount(user: { id: string; memberships: Array<{ role: string; agencyId?: string }> }, userId: string, subAccountId: string) {
    await this.requireAgencyAdminOverSubAccount(user, subAccountId);
    return this.prisma.membership.deleteMany({
      where: { userId, subAccountId, role: 'agent' },
    });
  }

  /** Substitui a lista de sub-accounts atendidas por um atendente. */
  async syncSubAccounts(
    user: { id: string; memberships: Array<{ role: string; agencyId?: string }> },
    targetUserId: string,
    subAccountIds: string[],
  ) {
    // Resolve a agency do invoker
    const isSuperAdmin = user.memberships.some((m) => m.role === 'super_admin');
    const agencyId = isSuperAdmin ? null : user.memberships.find((m) => m.agencyId)?.agencyId;
    if (!isSuperAdmin && !agencyId) throw new BadRequestException('Sem agência');

    // Garante que todas as subs pertencem à agência do invoker
    if (agencyId) {
      const validSubs = await this.prisma.subAccount.findMany({
        where: { id: { in: subAccountIds }, agencyId },
        select: { id: true },
      });
      const validIds = new Set(validSubs.map((s) => s.id));
      const invalid = subAccountIds.filter((id) => !validIds.has(id));
      if (invalid.length > 0) {
        throw new BadRequestException(`Sub-accounts fora da sua agência: ${invalid.join(', ')}`);
      }
    }

    // Memberships atuais (agent) do user-alvo, restritas à agência (se houver)
    const currentScope = agencyId
      ? { userId: targetUserId, role: 'agent' as const, subAccount: { agencyId } }
      : { userId: targetUserId, role: 'agent' as const };
    const current = await this.prisma.membership.findMany({
      where: currentScope,
      select: { id: true, subAccountId: true },
    });
    const currentIds = new Set(current.map((m) => m.subAccountId).filter((v): v is string => !!v));
    const desiredIds = new Set(subAccountIds);

    const toAdd = subAccountIds.filter((id) => !currentIds.has(id));
    const toRemove = current.filter((m) => m.subAccountId && !desiredIds.has(m.subAccountId));

    // Pega cloudtalk_agent_id de qualquer membership existente do user pra herdar
    const ref = current.find((m) => true);
    let cloudtalkAgentId: string | null = null;
    if (toAdd.length > 0) {
      const refMembership = await this.prisma.membership.findFirst({
        where: { userId: targetUserId, role: 'agent', cloudtalkAgentId: { not: null } },
        select: { cloudtalkAgentId: true },
      });
      cloudtalkAgentId = refMembership?.cloudtalkAgentId ?? null;
    }

    await this.prisma.$transaction([
      ...toRemove.map((m) => this.prisma.membership.delete({ where: { id: m.id } })),
      ...toAdd.map((subAccountId) =>
        this.prisma.membership.create({
          data: { userId: targetUserId, subAccountId, role: 'agent', cloudtalkAgentId },
        }),
      ),
    ]);

    return { added: toAdd.length, removed: toRemove.length, total: desiredIds.size };
  }

  private async requireAgencyAdminOverSubAccount(
    user: { memberships: Array<{ role: string; agencyId?: string }> },
    subAccountId: string,
  ) {
    const isSuperAdmin = user.memberships.some((m) => m.role === 'super_admin');
    if (isSuperAdmin) return;
    const adminAgencyId = user.memberships.find((m) => m.role === 'agency_admin' && m.agencyId)?.agencyId;
    if (!adminAgencyId) throw new BadRequestException('Sem permissão');
    const sub = await this.prisma.subAccount.findUnique({
      where: { id: subAccountId },
      select: { agencyId: true },
    });
    if (!sub || sub.agencyId !== adminAgencyId) {
      throw new BadRequestException('Sub-account fora da sua agência');
    }
  }

  async remove(userId: string, agencyId: string) {
    const subIds = (
      await this.prisma.subAccount.findMany({ where: { agencyId }, select: { id: true } })
    ).map((s) => s.id);
    // Remove TODAS as memberships nessa agência
    await this.prisma.membership.deleteMany({
      where: {
        userId,
        OR: [{ agencyId }, { subAccountId: { in: subIds } }],
      },
    });
    // Desativa o usuário (não deletamos para preservar audit logs / interaction.agent_user_id)
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'disabled' } });
    return { ok: true };
  }
}
