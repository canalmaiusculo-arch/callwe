import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { AgenciesService } from './agencies.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ROLES } from '@callwe/shared';
import { ZodBody } from '../../common/pipes/zod.pipe.js';

const CreateDto = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug deve ser minúsculo com hífens'),
  billingEmail: z.string().email(),
});

const UpdateDto = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  logoUrl: z.string().max(400_000).nullable().optional(),
});

const InviteAdminDto = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
});

@Controller('agencies')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(ROLES.SUPER_ADMIN)
export class AgenciesController {
  constructor(private readonly svc: AgenciesService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@ZodBody(CreateDto) dto: z.infer<typeof CreateDto>) {
    return this.svc.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @ZodBody(UpdateDto) dto: z.infer<typeof UpdateDto>) {
    return this.svc.update(id, dto);
  }

  @Post(':id/invite-admin')
  inviteAdmin(@Param('id') id: string, @ZodBody(InviteAdminDto) dto: z.infer<typeof InviteAdminDto>) {
    return this.svc.inviteAdmin(id, dto);
  }

  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
