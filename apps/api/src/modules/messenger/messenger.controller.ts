import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { MessengerService } from './messenger.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ROLES } from '@callwe/shared';
import { ZodBody } from '../../common/pipes/zod.pipe.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';

const EnablePageDto = z.object({
  pageId: z.string(),
  pageName: z.string(),
  pageAccessToken: z.string(),
  channel: z.enum(['messenger', 'instagram']).optional(),
});

const SendDto = z.object({ text: z.string().min(1).max(2000) });

@Controller('messenger')
@UseGuards(AuthGuard('jwt'))
export class MessengerController {
  constructor(private readonly svc: MessengerService) {}

  // ---- Inbox (atendente / cliente / agência) ----

  /** Conversas acessíveis ao usuário; opcionalmente filtra por sub-account. */
  @Get('conversations')
  conversations(@CurrentUser() user: AuthUser, @Query('subAccountId') subAccountId?: string) {
    return this.svc.listConversations(user, subAccountId);
  }

  @Get('conversations/:id/messages')
  messages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.getMessages(user, id);
  }

  @Post('conversations/:id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(SendDto) dto: z.infer<typeof SendDto>,
  ) {
    return this.svc.sendMessage(user, id, dto.text);
  }

  // ---- Habilitar páginas (agência/super) — tenant-scoped ----

  @Get('pages')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  connectedPages(@Req() req: { tenant: { subAccountId: string } }) {
    return this.svc.listConnectedPages(req.tenant.subAccountId);
  }

  @Get('pages/enabled')
  @UseGuards(TenantGuard)
  enabledPages(@Req() req: { tenant: { subAccountId: string } }) {
    return this.svc.listEnabledPages(req.tenant.subAccountId);
  }

  @Post('pages/enable')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  enable(
    @Req() req: { tenant: { subAccountId: string } },
    @ZodBody(EnablePageDto) dto: z.infer<typeof EnablePageDto>,
  ) {
    return this.svc.enablePage(req.tenant.subAccountId, dto);
  }

  @Delete('pages/:pageId')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  disable(@Req() req: { tenant: { subAccountId: string } }, @Param('pageId') pageId: string) {
    return this.svc.disablePage(req.tenant.subAccountId, pageId);
  }
}
