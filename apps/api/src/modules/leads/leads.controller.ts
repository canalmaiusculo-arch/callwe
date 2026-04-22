import { Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { LeadsService } from './leads.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { ZodBody } from '../../common/pipes/zod.pipe.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';

const CreateLeadDto = z.object({
  source: z.enum(['inbound_call', 'outbound_call', 'meta_ads', 'sms', 'manual', 'import', 'api']),
  sourceRef: z.string().optional(),
  name: z.string().optional(),
  phoneE164: z.string().optional(),
  email: z.string().email().optional(),
  customFields: z.record(z.any()).optional(),
});

const UpdateLeadDto = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phoneE164: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'won', 'lost']).optional(),
  lostReason: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
});

const NoteDto = z.object({ body: z.string().min(1) });

@Controller('leads')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class LeadsController {
  constructor(private readonly svc: LeadsService) {}

  @Get()
  list(@Req() req: { tenant: { subAccountId: string } }, @Query('status') status?: string, @Query('search') search?: string) {
    return this.svc.list(req.tenant.subAccountId, { status: status as never, search });
  }

  @Get(':id')
  get(@Req() req: { tenant: { subAccountId: string } }, @Param('id') id: string) {
    return this.svc.get(req.tenant.subAccountId, id);
  }

  @Post()
  create(@Req() req: { tenant: { subAccountId: string } }, @ZodBody(CreateLeadDto) dto: z.infer<typeof CreateLeadDto>) {
    return this.svc.create(req.tenant.subAccountId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: { tenant: { subAccountId: string } },
    @Param('id') id: string,
    @ZodBody(UpdateLeadDto) dto: z.infer<typeof UpdateLeadDto>,
  ) {
    return this.svc.update(req.tenant.subAccountId, id, dto);
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(NoteDto) dto: z.infer<typeof NoteDto>,
  ) {
    return this.svc.addNote(id, user.id, dto.body);
  }

  @Post(':id/call')
  callLead(
    @Req() req: { tenant: { subAccountId: string } },
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.clickToCall(req.tenant.subAccountId, id, user.email);
  }
}
