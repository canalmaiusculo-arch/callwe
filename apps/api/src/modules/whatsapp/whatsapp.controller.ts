import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WhatsappService } from './whatsapp.service.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ROLES } from '@callwe/shared';

@Controller('whatsapp')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class WhatsappController {
  constructor(private readonly svc: WhatsappService) {}

  /** Lista grupos do número Z-API conectado (usado pra dropdown de configuração). */
  @Get('groups')
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  groups() {
    return this.svc.listGroups();
  }

  /** Envia o resumo IA de uma interação pro grupo WhatsApp da sub_account dela. */
  @Post('send-summary/:interactionId')
  sendSummary(@CurrentUser() user: AuthUser, @Param('interactionId') interactionId: string) {
    return this.svc.sendInteractionSummary(user.id, interactionId);
  }
}
