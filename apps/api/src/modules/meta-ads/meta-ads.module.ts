import { Module } from '@nestjs/common';
import { MetaAdsWebhookController } from './webhooks.controller.js';
import { MetaAdsOAuthController } from './oauth.controller.js';
import { MetaAdsService } from './meta-ads.service.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';

@Module({
  imports: [IntegrationsModule],
  controllers: [MetaAdsWebhookController, MetaAdsOAuthController],
  providers: [MetaAdsService],
  exports: [MetaAdsService],
})
export class MetaAdsModule {}
