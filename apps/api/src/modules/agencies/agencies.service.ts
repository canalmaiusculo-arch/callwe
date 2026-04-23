import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { env } from '../../config/env.js';

@Injectable()
export class AgenciesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.agency.findMany({
      include: {
        _count: { select: { subAccounts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: { name: string; slug: string; billingEmail: string }) {
    const exists = await this.prisma.agency.findUnique({ where: { slug: input.slug } });
    if (exists) throw new ConflictException('Slug já em uso');
    return this.prisma.agency.create({ data: input });
  }

  async update(id: string, input: { name?: string; status?: 'active' | 'suspended' }) {
    return this.prisma.agency.update({ where: { id }, data: input });
  }

  /** Convida o primeiro agency_admin de uma agência. Retorna URL de convite. */
  async inviteAdmin(agencyId: string, input: { email: string; fullName: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('Email já cadastrado');

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const tempPassword = randomBytes(16).toString('hex');
    const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash,
        status: 'invited',
      },
    });

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.membership.create({
      data: { userId: user.id, agencyId, role: 'agency_admin' },
    });

    return {
      email: user.email,
      inviteUrl: `${env.APP_URL}/accept-invite?token=${token}`,
    };
  }

  /** Soft delete: suspende a agência e todas as sub-contas dela. */
  async archive(id: string) {
    await this.prisma.subAccount.updateMany({
      where: { agencyId: id },
      data: { status: 'archived' },
    });
    return this.prisma.agency.update({ where: { id }, data: { status: 'suspended' } });
  }

  async get(id: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id },
      include: {
        subAccounts: { select: { id: true, name: true, status: true } },
        memberships: {
          where: { role: 'agency_admin' },
          include: { user: { select: { id: true, email: true, fullName: true, status: true } } },
        },
      },
    });
    if (!agency) throw new NotFoundException();
    return agency;
  }
}
