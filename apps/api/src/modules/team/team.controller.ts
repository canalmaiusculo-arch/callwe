import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
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
});

const AcceptInviteDto = z.object({
  token: z.string(),
  password: z.string().min(8),
});

const AssignDto = z.object({
  userId: z.string().uuid(),
  subAccountId: z.string().uuid(),
});

@Controller('team')
export class TeamController {
  constructor(private readonly svc: TeamService) {}

  /** Aceitar convite — público, validado por token. */
  @Post('accept-invite')
  acceptInvite(@Body() body: z.infer<typeof AcceptInviteDto>) {
    const dto = AcceptInviteDto.parse(body);
    return this.svc.acceptInvite(dto.token, dto.password);
  }

  // --------- endpoints autenticados ---------

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  list(@CurrentUser() user: AuthUser) {
    const agencyId = user.memberships.find((m) => m.agencyId)?.agencyId;
    if (!agencyId) return [];
    return this.svc.list(agencyId);
  }

  @Post('invite')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  invite(@CurrentUser() user: AuthUser, @ZodBody(InviteDto) dto: z.infer<typeof InviteDto>) {
    const agencyId = user.memberships.find((m) => m.agencyId)?.agencyId;
    if (!agencyId) throw new Error('Sem agência');
    return this.svc.invite(agencyId, dto);
  }

  @Post('assign')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  assign(@ZodBody(AssignDto) dto: z.infer<typeof AssignDto>) {
    return this.svc.assignSubAccount(dto.userId, dto.subAccountId);
  }

  @Delete('assign/:userId/:subAccountId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  unassign(@Param('userId') userId: string, @Param('subAccountId') subAccountId: string) {
    return this.svc.unassignSubAccount(userId, subAccountId);
  }

  @Delete(':userId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    const agencyId = user.memberships.find((m) => m.agencyId)?.agencyId;
    if (!agencyId) throw new Error('Sem agência');
    return this.svc.remove(userId, agencyId);
  }
}
