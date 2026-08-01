import { Module } from '@nestjs/common';
import { MessengerController } from './messenger.controller.js';
import { MessengerService } from './messenger.service.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { MetaAdsModule } from '../meta-ads/meta-ads.module.js';

@Module({
  imports: [IntegrationsModule, MetaAdsModule],
  controllers: [MessengerController],
  providers: [MessengerService],
})
export class MessengerModule {}
