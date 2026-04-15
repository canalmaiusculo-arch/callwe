import { Module } from '@nestjs/common';
import { SubAccountsController } from './sub-accounts.controller.js';
import { SubAccountsService } from './sub-accounts.service.js';

@Module({
  controllers: [SubAccountsController],
  providers: [SubAccountsService],
  exports: [SubAccountsService],
})
export class SubAccountsModule {}
