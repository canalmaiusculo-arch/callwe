import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { CasesService } from './cases.service.js';
import { ZodBody } from '../../common/pipes/zod.pipe.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';

const NoteDto = z.object({ body: z.string().min(1).max(4000) });

const FollowUpDto = z.object({
  followUpAt: z.string().datetime(),
  reason: z.string().max(2000).optional(),
  assignedToId: z.string().uuid().optional(),
});

const ResolveDto = z.object({
  outcome: z.enum(['booked', 'won', 'lost']),
  note: z.string().min(1).max(4000),
  visitAt: z.string().datetime().optional(),
  visitConfirmed: z.boolean().optional(),
});

const CreateDto = z.object({
  subAccountId: z.string().uuid(),
  source: z.enum(['inbound_call', 'outbound_call', 'meta_ads', 'sms', 'manual', 'form', 'messenger']),
  name: z.string().max(200).optional(),
  phoneE164: z.string().max(40).optional(),
  email: z.string().email().optional(),
  address: z.string().max(400).optional(),
  note: z.string().max(4000).optional(),
});

@Controller('cases')
@UseGuards(AuthGuard('jwt'))
export class CasesController {
  constructor(private readonly svc: CasesService) {}

  /** Lista casos das sub-accounts do atendente (ou de um atendente supervisionado via agentId). */
  @Get('mine')
  mine(@CurrentUser() user: AuthUser, @Query() q: Record<string, string>) {
    return this.svc.listMine(
      user,
      {
        tab: q.tab as never,
        origin: q.origin,
        subAccountId: q.subAccountId,
        date: q.date,
        search: q.search,
      },
      q.agentId,
    );
  }

  @Get('counts')
  counts(@CurrentUser() user: AuthUser, @Query('agentId') agentId?: string) {
    return this.svc.counts(user, agentId);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.detail(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ZodBody(CreateDto) dto: z.infer<typeof CreateDto>) {
    return this.svc.createManual(user, dto);
  }

  @Post(':id/notes')
  addNote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(NoteDto) dto: z.infer<typeof NoteDto>,
  ) {
    return this.svc.addNote(user, id, dto.body);
  }

  @Post(':id/follow-up')
  followUp(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(FollowUpDto) dto: z.infer<typeof FollowUpDto>,
  ) {
    return this.svc.scheduleFollowUp(user, id, {
      followUpAt: new Date(dto.followUpAt),
      reason: dto.reason,
      assignedToId: dto.assignedToId,
    });
  }

  @Post(':id/resolve')
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(ResolveDto) dto: z.infer<typeof ResolveDto>,
  ) {
    return this.svc.resolve(user, id, {
      outcome: dto.outcome,
      note: dto.note,
      visitAt: dto.visitAt ? new Date(dto.visitAt) : undefined,
      visitConfirmed: dto.visitConfirmed,
    });
  }

  @Post(':id/reopen')
  reopen(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.reopen(user, id);
  }
}
