import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { TeamService } from './team.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ROLES } from '@callwe/shared';
import { ZodBody } from '../../common/pipes/zod.pipe.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';

const InviteDto = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  subAccountIds: z.array(z.string().uuid()).optional(),
  role: z.enum(['agent', 'client_viewer']).optional(),
});

const AcceptInviteDto = z.object({
  token: z.string(),
  password: z.string().min(8),
});

const AssignDto = z.object({
  userId: z.string().uuid(),
  subAccountId: z.string().uuid(),
});

const SyncSubsDto = z.object({
  subAccountIds: z.array(z.string().uuid()),
});

const ProfileDto = z.object({
  fullName: z.string().min(2).optional(),
  // Foto de perfil como data URL (imagem redimensionada no cliente). Cap ~300KB.
  avatarUrl: z.string().max(400_000).nullable().optional(),
});

@Controller('team')
export class TeamController {
  constructor(private readonly svc: TeamService) {}

  /** Aceitar convite — público. */
  @Post('accept-invite')
  acceptInvite(@Body() body: z.infer<typeof AcceptInviteDto>) {
    const dto = AcceptInviteDto.parse(body);
    return this.svc.acceptInvite(dto.token, dto.password);
  }

  // ---------- agency_admin (read-only) ----------
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  list(@CurrentUser() user: AuthUser, @Query('agencyId') queryAgencyId?: string) {
    const isSuperAdmin = user.memberships.some((m) => m.role === 'super_admin');
    const agencyId = isSuperAdmin && queryAgencyId
      ? queryAgencyId
      : user.memberships.find((m) => m.agencyId)?.agencyId;
    if (!agencyId) return [];
    return this.svc.list(agencyId);
  }

  // ---------- super_admin only ----------

  @Get('all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.SUPER_ADMIN)
  listAll() {
    return this.svc.listAllAgents();
  }

  @Post('invite')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  invite(@CurrentUser() user: AuthUser, @ZodBody(InviteDto) dto: z.infer<typeof InviteDto>) {
    return this.svc.invite(user, dto);
  }

  /** Redefine acesso: reenvia convite (pendente) ou link de reset de senha (ativo). */
  @Post(':userId/reset-access')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  resetAccess(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.svc.resetAccess(user, userId);
  }

  @Post('assign')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  assign(@CurrentUser() user: AuthUser, @ZodBody(AssignDto) dto: z.infer<typeof AssignDto>) {
    return this.svc.assignSubAccount(user, dto.userId, dto.subAccountId);
  }

  @Delete('assign/:userId/:subAccountId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  unassign(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Param('subAccountId') subAccountId: string,
  ) {
    return this.svc.unassignSubAccount(user, userId, subAccountId);
  }

  /** Sincroniza as sub-accounts que um atendente atende (substitui a lista atual). */
  @Post(':userId/sub-accounts')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  syncSubAccounts(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @ZodBody(SyncSubsDto) dto: z.infer<typeof SyncSubsDto>,
  ) {
    return this.svc.syncSubAccounts(user, userId, dto.subAccountIds);
  }

  @Patch(':userId/profile')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  updateProfile(
    @Param('userId') userId: string,
    @ZodBody(ProfileDto) dto: z.infer<typeof ProfileDto>,
  ) {
    return this.svc.updateProfile(userId, dto);
  }

  @Delete(':userId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.SUPER_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    const agencyId = user.memberships.find((m) => m.agencyId)?.agencyId ?? '';
    return this.svc.remove(userId, agencyId);
  }
}
