import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { IntegrationProvider } from '@callwe/db';
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

  /** Desconecta a integração (zera credenciais e desabilita páginas vinculadas). */
  @Delete(':provider')
  disconnect(
    @Req() req: { tenant: { subAccountId: string } },
    @Param('provider') provider: string,
  ) {
    return this.svc.disconnect(req.tenant.subAccountId, provider as IntegrationProvider);
  }
}
