import { Controller, Get, Header, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
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

const NoteDto = z.object({ body: z.string().min(1), shared: z.boolean().optional() });

function parseFilters(q: Record<string, string | undefined>) {
  return {
    status: q.status as never,
    source: q.source as never,
    search: q.search,
    ownerUserId: q.ownerUserId,
    tags: q.tags ? q.tags.split(',').filter(Boolean) : undefined,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
  };
}

@Controller('leads')
@UseGuards(AuthGuard('jwt'))
export class LeadsController {
  constructor(private readonly svc: LeadsService) {}

  /** Lista leads de TODAS as sub-accounts que o atendente atende. */
  @Get('mine')
  mine(@CurrentUser() user: AuthUser, @Query() q: Record<string, string>) {
    const subAccountIds = user.memberships
      .map((m) => m.subAccountId)
      .filter((v): v is string => !!v);
    if (subAccountIds.length === 0) return [];
    return this.svc.listMany(subAccountIds, parseFilters(q));
  }

  @Get()
  @UseGuards(TenantGuard)
  list(@Req() req: { tenant: { subAccountId: string } }, @Query() q: Record<string, string>) {
    return this.svc.list(req.tenant.subAccountId, parseFilters(q));
  }

  /** Export CSV com os mesmos filtros aplicados. */
  @Get('export.csv')
  @UseGuards(TenantGuard)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @Req() req: { tenant: { subAccountId: string } },
    @Query() q: Record<string, string>,
    @Res() res: Response,
  ) {
    const csv = await this.svc.exportCsv(req.tenant.subAccountId, parseFilters(q));
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="leads-${stamp}.csv"`);
    res.send('﻿' + csv); // BOM pra Excel abrir UTF-8 certinho
  }

  @Get(':id')
  @UseGuards(TenantGuard)
  get(@Req() req: { tenant: { subAccountId: string; role: string } }, @Param('id') id: string) {
    return this.svc.get(req.tenant.subAccountId, id, req.tenant.role === 'client_viewer');
  }

  @Post()
  @UseGuards(TenantGuard)
  create(@Req() req: { tenant: { subAccountId: string } }, @ZodBody(CreateLeadDto) dto: z.infer<typeof CreateLeadDto>) {
    return this.svc.create(req.tenant.subAccountId, dto);
  }

  @Patch(':id')
  @UseGuards(TenantGuard)
  update(
    @Req() req: { tenant: { subAccountId: string } },
    @Param('id') id: string,
    @ZodBody(UpdateLeadDto) dto: z.infer<typeof UpdateLeadDto>,
  ) {
    return this.svc.update(req.tenant.subAccountId, id, dto);
  }

  @Post(':id/notes')
  @UseGuards(TenantGuard)
  addNote(
    @Req() req: { tenant: { role: string } },
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(NoteDto) dto: z.infer<typeof NoteDto>,
  ) {
    // Cliente só posta no chat compartilhado; atendente/agência escolhem (default: interno).
    const isClient = req.tenant.role === 'client_viewer';
    const shared = isClient ? true : (dto.shared ?? false);
    return this.svc.addNote(id, user.id, dto.body, { shared, authorRole: req.tenant.role });
  }

  @Post(':id/call')
  @UseGuards(TenantGuard)
  callLead(
    @Req() req: { tenant: { subAccountId: string } },
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.clickToCall(req.tenant.subAccountId, id, user.email);
  }
}
