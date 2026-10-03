import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CalendarService } from './calendar.service.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';

@Controller('calendar')
@UseGuards(AuthGuard('jwt'))
export class CalendarController {
  constructor(private readonly svc: CalendarService) {}

  /** Estimativas agendadas no intervalo (ISO). Escopo: cliente/atendente/agência. */
  @Get('estimates')
  estimates(@CurrentUser() user: AuthUser, @Query() q: Record<string, string>) {
    const from = q.from ? new Date(q.from) : new Date();
    const to = q.to ? new Date(q.to) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    return this.svc.listEstimates(user, {
      from,
      to,
      subAccountId: q.subAccountId,
      agentId: q.agentId,
      agencyId: q.agencyId,
    });
  }
}
