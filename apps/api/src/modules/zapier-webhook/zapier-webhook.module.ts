import { Module } from '@nestjs/common';
import { ZapierWebhookController } from './zapier-webhook.controller.js';
import { LeadsModule } from '../leads/leads.module.js';

@Module({
  imports: [LeadsModule],
  controllers: [ZapierWebhookController],
})
export class ZapierWebhookModule {}
