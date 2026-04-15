import { Module } from '@nestjs/common';
import { InteractionsController } from './interactions.controller.js';
import { InteractionsService } from './interactions.service.js';

@Module({
  controllers: [InteractionsController],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}
