import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthController } from './modules/health/health.controller.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { CloudtalkModule } from './modules/cloudtalk/cloudtalk.module.js';
import { MetaAdsModule } from './modules/meta-ads/meta-ads.module.js';
import { LeadsModule } from './modules/leads/leads.module.js';
import { InteractionsModule } from './modules/interactions/interactions.module.js';
import { SubAccountsModule } from './modules/sub-accounts/sub-accounts.module.js';
import { BriefingsModule } from './modules/briefings/briefings.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { IntegrationsModule } from './modules/integrations/integrations.module.js';
import { QueuesModule } from './modules/queues/queues.module.js';
import { PhoneNumbersModule } from './modules/phone-numbers/phone-numbers.module.js';
import { TeamModule } from './modules/team/team.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { AgenciesModule } from './modules/agencies/agencies.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    QueuesModule,
    AuthModule,
    SubAccountsModule,
    PhoneNumbersModule,
    TeamModule,
    ReportsModule,
    AgenciesModule,
    LeadsModule,
    InteractionsModule,
    BriefingsModule,
    CloudtalkModule,
    MetaAdsModule,
    IntegrationsModule,
    DashboardModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
