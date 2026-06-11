import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { ConversationsService } from './conversations.service.js';
import { ZodBody } from '../../common/pipes/zod.pipe.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';

const MessageDto = z.object({ body: z.string().min(1) });

@Controller('conversations')
@UseGuards(AuthGuard('jwt'))
export class ConversationsController {
  constructor(private readonly svc: ConversationsService) {}

  /** Lista as conversas (chat compartilhado) acessíveis ao usuário, com não lidas. */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.list(user);
  }

  @Get(':leadId/messages')
  messages(@CurrentUser() user: AuthUser, @Param('leadId') leadId: string) {
    return this.svc.messages(user, leadId);
  }

  @Post(':leadId/read')
  read(@CurrentUser() user: AuthUser, @Param('leadId') leadId: string) {
    return this.svc.markRead(user, leadId);
  }

  @Post(':leadId/messages')
  post(
    @CurrentUser() user: AuthUser,
    @Param('leadId') leadId: string,
    @ZodBody(MessageDto) dto: z.infer<typeof MessageDto>,
  ) {
    return this.svc.post(user, leadId, dto.body);
  }
}
