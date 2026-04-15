import { Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { BriefingsService } from './briefings.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { ZodBody } from '../../common/pipes/zod.pipe.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';

const UpsertDto = z.object({
  businessSummary: z.string().min(1),
  targetAudience: z.string().min(1),
  keyServices: z.array(z.any()).optional(),
  pricingGuidelines: z.string().optional(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  scripts: z.record(z.any()).optional(),
  dosAndDonts: z.record(z.any()).optional(),
});

@Controller('briefings')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class BriefingsController {
  constructor(private readonly svc: BriefingsService) {}

  @Get()
  get(@Req() req: { tenant: { subAccountId: string } }) {
    return this.svc.get(req.tenant.subAccountId);
  }

  @Put()
  upsert(
    @Req() req: { tenant: { subAccountId: string } },
    @CurrentUser() user: AuthUser,
    @ZodBody(UpsertDto) dto: z.infer<typeof UpsertDto>,
  ) {
    return this.svc.upsert(req.tenant.subAccountId, user.id, dto);
  }
}
