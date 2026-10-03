import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller.js';
import { CalendarService } from './calendar.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
