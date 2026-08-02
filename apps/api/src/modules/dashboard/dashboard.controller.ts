import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly svc: DashboardService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  stats(@Req() req: { tenant: { subAccountId: string } }) {
    return this.svc.stats(req.tenant.subAccountId);
  }

  @Get('agency-stats')
  @UseGuards(AuthGuard('jwt'))
  async agencyStats(
    @CurrentUser() user: AuthUser,
    @Query('agencyId') queryAgencyId?: string,
    @Query('period') period?: string,
    @Query('subAccountId') subAccountId?: string,
  ) {
    const isSuperAdmin = user.memberships.some((m) => m.role === 'super_admin');
    // Agência do próprio usuário (via membership).
    let agencyId = user.memberships.find((m) => m.agencyId)?.agencyId;
    if (isSuperAdmin) {
      // super_admin: usa a agência escolhida (impersonation) → a própria →
      // e, se for super_admin sem agência, a primeira do banco (fallback global).
      agencyId =
        queryAgencyId ??
        agencyId ??
        (await this.prisma.agency.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id;
    }
    if (!agencyId) return null;
    const validPeriod = period === 'today' || period === '30d' ? period : '7d';
    return this.svc.agencyStats(agencyId, {
      period: validPeriod,
      subAccountId: subAccountId || undefined,
    });
  }
}
