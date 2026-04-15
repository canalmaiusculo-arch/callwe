import { Module } from '@nestjs/common';
import { BriefingsController } from './briefings.controller.js';
import { BriefingsService } from './briefings.service.js';

@Module({
  controllers: [BriefingsController],
  providers: [BriefingsService],
  exports: [BriefingsService],
})
export class BriefingsModule {}
