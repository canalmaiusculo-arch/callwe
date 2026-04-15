import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InteractionsService } from './interactions.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';

@Controller('interactions')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class InteractionsController {
  constructor(private readonly svc: InteractionsService) {}

  @Get()
  list(@Req() req: { tenant: { subAccountId: string } }, @Query('type') type?: string) {
    return this.svc.list(req.tenant.subAccountId, { type });
  }

  @Get(':id')
  async get(
    @Req() req: { tenant: { subAccountId: string }; ip?: string },
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const interaction = await this.svc.get(req.tenant.subAccountId, id);
    if (interaction?.recordingUrl) {
      await this.svc.logRecordingAccess(id, user.id, req.ip);
    }
    return interaction;
  }
}
