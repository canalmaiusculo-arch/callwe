import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { SubAccountsService } from './sub-accounts.service.js';
import { ZodBody } from '../../common/pipes/zod.pipe.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ROLES } from '@callwe/shared';

const CreateDto = z.object({ name: z.string().min(2), slug: z.string().min(2), agencyId: z.string().uuid() });

@Controller('sub-accounts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SubAccountsController {
  constructor(private readonly svc: SubAccountsService) {}

  /** Todas as subcontas que o usuário pode acessar (para o seletor após login). */
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.svc.listForUser(user.id);
  }

  @Get()
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  list(@CurrentUser() user: AuthUser) {
    const agencyId = user.memberships.find((m) => m.agencyId)?.agencyId;
    if (!agencyId) return [];
    return this.svc.list(agencyId);
  }

  @Post()
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  create(@ZodBody(CreateDto) dto: z.infer<typeof CreateDto>) {
    return this.svc.create(dto.agencyId, dto);
  }
}
