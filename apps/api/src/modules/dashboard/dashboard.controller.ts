import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  stats(@Req() req: { tenant: { subAccountId: string } }) {
    return this.svc.stats(req.tenant.subAccountId);
  }

  @Get('agency-stats')
  @UseGuards(AuthGuard('jwt'))
  agencyStats(@CurrentUser() user: AuthUser) {
    const agencyId = user.memberships.find((m) => m.agencyId)?.agencyId;
    if (!agencyId) return null;
    return this.svc.agencyStats(agencyId);
  }
}
