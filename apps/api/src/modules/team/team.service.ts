import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
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
    agencyId: string,
    input: { email: string; fullName: string; subAccountIds?: string[]; role?: 'agent' | 'client_viewer' },
  ) {
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
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      assignedSubAccounts: u.memberships
        .filter((m) => m.subAccount)
        .map((m) => ({ id: m.subAccount!.id, name: m.subAccount!.name })),
    }));
  }

  async assignSubAccount(userId: string, subAccountId: string) {
    const exists = await this.prisma.membership.findFirst({
      where: { userId, subAccountId, role: 'agent' },
    });
    if (exists) return exists;
    return this.prisma.membership.create({
      data: { userId, subAccountId, role: 'agent' },
    });
  }

  async unassignSubAccount(userId: string, subAccountId: string) {
    return this.prisma.membership.deleteMany({
      where: { userId, subAccountId, role: 'agent' },
    });
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
