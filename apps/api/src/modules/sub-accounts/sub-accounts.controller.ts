import { BadRequestException, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { SubAccountsService } from './sub-accounts.service.js';
import { ZodBody } from '../../common/pipes/zod.pipe.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ROLES } from '@callwe/shared';

const CreateDto = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'slug must be lowercase, hyphens only'),
  agencyId: z.string().uuid().optional(),
});

const UpdateDto = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  plan: z.enum(['starter', 'pro', 'enterprise']).optional(),
});

const WhatsappDto = z.object({
  whatsappGroupId: z.string().min(1).nullable(),
});

@Controller('sub-accounts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SubAccountsController {
  constructor(private readonly svc: SubAccountsService) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.svc.listForUser(user.id);
  }

  @Get()
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  list(@CurrentUser() user: AuthUser, @Query('agencyId') agencyIdQuery?: string) {
    const isSuperAdmin = user.memberships.some((m) => m.role === 'super_admin');
    if (isSuperAdmin && agencyIdQuery) return this.svc.list(agencyIdQuery);
    if (isSuperAdmin && !agencyIdQuery) return this.svc.listAll();
    const agencyId = user.memberships.find((m) => m.agencyId)?.agencyId;
    if (!agencyId) return [];
    return this.svc.list(agencyId);
  }

  @Get(':id')
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN, ROLES.SUB_ACCOUNT_ADMIN)
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  create(@CurrentUser() user: AuthUser, @ZodBody(CreateDto) dto: z.infer<typeof CreateDto>) {
    const isSuperAdmin = user.memberships.some((m) => m.role === 'super_admin');
    let agencyId = dto.agencyId;
    if (!isSuperAdmin) {
      agencyId = user.memberships.find((m) => m.role === 'agency_admin' && m.agencyId)?.agencyId;
    }
    if (!agencyId) throw new BadRequestException('agencyId obrigatório');
    return this.svc.create(agencyId, { name: dto.name, slug: dto.slug });
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(UpdateDto) dto: z.infer<typeof UpdateDto>,
  ) {
    await this.svc.assertCanManage(user, id);
    return this.svc.update(id, dto);
  }

  /** Seta o grupo WhatsApp pra envio de resumos automáticos. */
  @Patch(':id/whatsapp')
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  setWhatsappGroup(
    @Param('id') id: string,
    @ZodBody(WhatsappDto) dto: z.infer<typeof WhatsappDto>,
  ) {
    return this.svc.setWhatsappGroup(id, dto.whatsappGroupId);
  }

  /** Retorna (e gera se não existir) a API key pra integração Zapier. */
  @Get(':id/zapier-key')
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  getZapierKey(@Param('id') id: string) {
    return this.svc.getOrCreateZapierApiKey(id);
  }

  /** Rotaciona a API key (invalida a anterior). */
  @Post(':id/zapier-key/rotate')
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  rotateZapierKey(@Param('id') id: string) {
    return this.svc.rotateZapierApiKey(id);
  }

  @Delete(':id/permanent')
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.svc.assertCanManage(user, id);
    return this.svc.remove(id);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN)
  async archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.svc.assertCanManage(user, id);
    return this.svc.archive(id);
  }
}
