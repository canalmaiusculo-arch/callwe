import { BadRequestException, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { WhatsappService } from './whatsapp.service.js';
import { ZodBody } from '../../common/pipes/zod.pipe.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ROLES } from '@callwe/shared';

const ConfigDto = z.object({
  instanceId: z.string().min(1),
  token: z.string().min(1),
  clientToken: z.string().min(1),
});

@Controller('whatsapp')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class WhatsappController {
  constructor(private readonly svc: WhatsappService) {}

  /** Resolve a agência do usuário (super_admin pode passar ?agencyId). */
  private agencyId(user: AuthUser, queryAgencyId?: string): string | null {
    const isSuper = user.memberships.some((m) => m.role === 'super_admin');
    if (isSuper && queryAgencyId) return queryAgencyId;
    return user.memberships.find((m) => m.role === 'agency_admin' && m.agencyId)?.agencyId ?? null;
  }

  /** Lista grupos do número Z-API da agência (ou global, fallback). */
  @Get('groups')
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  groups(@CurrentUser() user: AuthUser, @Query('agencyId') agencyId?: string) {
    return this.svc.listGroups(this.agencyId(user, agencyId));
  }

  /** Estado da config Z-API da agência. */
  @Get('config')
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  getConfig(@CurrentUser() user: AuthUser, @Query('agencyId') agencyId?: string) {
    const id = this.agencyId(user, agencyId);
    if (!id) throw new BadRequestException('Sem agência');
    return this.svc.getConfig(id);
  }

  /** Salva as credenciais Z-API da agência (número próprio). */
  @Put('config')
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  setConfig(
    @CurrentUser() user: AuthUser,
    @ZodBody(ConfigDto) dto: z.infer<typeof ConfigDto>,
    @Query('agencyId') agencyId?: string,
  ) {
    const id = this.agencyId(user, agencyId);
    if (!id) throw new BadRequestException('Sem agência');
    return this.svc.setConfig(id, dto);
  }

  /** Envia o resumo IA de uma interação pro grupo WhatsApp da sub_account dela. */
  @Post('send-summary/:interactionId')
  sendSummary(@CurrentUser() user: AuthUser, @Param('interactionId') interactionId: string) {
    return this.svc.sendInteractionSummary(user.id, interactionId);
  }
}
