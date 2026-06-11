import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  /** Eventos recentes (novos leads SMS/Meta/Formulário e chamadas perdidas) das subcontas acessíveis. */
  @Get('recent')
  recent(@CurrentUser() user: AuthUser) {
    return this.svc.recent(user);
  }
}
