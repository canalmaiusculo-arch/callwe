import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IntegrationsService } from './integrations.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';

@Controller('integrations')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class IntegrationsController {
  constructor(private readonly svc: IntegrationsService) {}

  @Get()
  list(@Req() req: { tenant: { subAccountId: string } }) {
    return this.svc.list(req.tenant.subAccountId);
  }
}
