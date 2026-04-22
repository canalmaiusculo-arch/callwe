import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { PhoneNumbersService } from './phone-numbers.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ROLES } from '@callwe/shared';
import { ZodBody } from '../../common/pipes/zod.pipe.js';

const CreateDto = z.object({
  subAccountId: z.string().uuid(),
  cloudtalkNumberId: z.string(),
  e164: z.string().regex(/^\+[1-9]\d{1,14}$/),
  label: z.string().optional(),
  country: z.string().length(2).optional(),
});

@Controller('phone-numbers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PhoneNumbersController {
  constructor(private readonly svc: PhoneNumbersService) {}

  /** Lista os números disponíveis no CloudTalk (todos), com info de qual subconta já tem. */
  @Get('available')
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  available() {
    return this.svc.listAvailable();
  }

  /** Lista números de uma subconta. */
  @Get()
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN, ROLES.SUB_ACCOUNT_ADMIN)
  list(@Query('subAccountId') subAccountId: string) {
    return this.svc.list(subAccountId);
  }

  @Post()
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  create(@ZodBody(CreateDto) dto: z.infer<typeof CreateDto>) {
    return this.svc.create(dto.subAccountId, dto);
  }

  @Delete(':id')
  @Roles(ROLES.AGENCY_ADMIN, ROLES.SUPER_ADMIN)
  release(@Param('id') id: string) {
    return this.svc.release(id);
  }
}
