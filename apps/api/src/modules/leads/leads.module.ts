import { Module, forwardRef } from '@nestjs/common';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';
import { CloudtalkModule } from '../cloudtalk/cloudtalk.module.js';

@Module({
  imports: [forwardRef(() => CloudtalkModule)],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
