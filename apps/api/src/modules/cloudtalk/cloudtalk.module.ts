import { Module } from '@nestjs/common';
import { CloudtalkService } from './cloudtalk.service.js';
import { CloudtalkWebhooksController } from './webhooks.controller.js';
import { CallFlowController } from './call-flow.controller.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { LeadsModule } from '../leads/leads.module.js';

@Module({
  imports: [RealtimeModule, LeadsModule],
  controllers: [CloudtalkWebhooksController, CallFlowController],
  providers: [CloudtalkService],
  exports: [CloudtalkService],
})
export class CloudtalkModule {}
