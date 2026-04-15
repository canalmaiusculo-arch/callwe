import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('stats')
  stats(@Req() req: { tenant: { subAccountId: string } }) {
    return this.svc.stats(req.tenant.subAccountId);
  }
}
