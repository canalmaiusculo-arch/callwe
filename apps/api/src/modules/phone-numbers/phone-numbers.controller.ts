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
  label: z.string().nullish(),
  country: z.string().nullish(),
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
  @Roles(ROLES.SUPER_ADMIN)
  create(@ZodBody(CreateDto) dto: z.infer<typeof CreateDto>) {
    return this.svc.create(dto.subAccountId, {
      cloudtalkNumberId: dto.cloudtalkNumberId,
      e164: dto.e164,
      label: dto.label?.trim() || undefined,
      country: normalizeCountry(dto.country),
    });
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN)
  release(@Param('id') id: string) {
    return this.svc.release(id);
  }
}

/** Aceita ISO-2, ISO-3 ou nome do país e devolve um código ISO-2 confiável. */
function normalizeCountry(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return undefined;
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  // Mapeamento mínimo dos mais comuns no negócio (US/BR/Canadá)
  const aliases: Record<string, string> = {
    USA: 'US',
    'UNITED STATES': 'US',
    BRA: 'BR',
    BRASIL: 'BR',
    BRAZIL: 'BR',
    CAN: 'CA',
    CANADA: 'CA',
    GBR: 'GB',
    'UNITED KINGDOM': 'GB',
  };
  return aliases[trimmed] ?? undefined;
}
