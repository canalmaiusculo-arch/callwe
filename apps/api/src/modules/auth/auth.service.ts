import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { env } from '../../config/env.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: { email: string; password: string; fullName: string }) {
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        status: 'active',
      },
      select: { id: true, email: true, fullName: true },
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });
    if (!user || user.status === 'disabled') throw new UnauthorizedException();
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException();
    return user;
  }

  async issueTokens(user: { id: string; email: string; memberships: Array<{ agencyId: string | null; subAccountId: string | null; role: string }> }, ctx: { ip?: string; ua?: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      memberships: user.memberships.map((m) => ({
        agencyId: m.agencyId ?? undefined,
        subAccountId: m.subAccountId ?? undefined,
        role: m.role,
      })),
    };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        ip: ctx.ip,
        userAgent: ctx.ua,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { accessToken, refreshToken, expiresIn: env.JWT_ACCESS_TTL };
  }

  async refresh(refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: hash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { include: { memberships: true } } },
    });
    if (!session) throw new UnauthorizedException('Invalid refresh token');
    return this.issueTokens(session.user, {});
  }

  async revoke(refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
