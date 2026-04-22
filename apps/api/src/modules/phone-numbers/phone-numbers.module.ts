import { Module } from '@nestjs/common';
import { PhoneNumbersController } from './phone-numbers.controller.js';
import { PhoneNumbersService } from './phone-numbers.service.js';
import { CloudtalkModule } from '../cloudtalk/cloudtalk.module.js';

@Module({
  imports: [CloudtalkModule],
  controllers: [PhoneNumbersController],
  providers: [PhoneNumbersService],
  exports: [PhoneNumbersService],
})
export class PhoneNumbersModule {}
