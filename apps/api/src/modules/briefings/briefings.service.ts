import { Injectable } from '@nestjs/common';
import { Prisma } from '@callwe/db';
import { PrismaService } from '../prisma/prisma.service.js';

export interface BriefingInput {
  businessSummary: string;
  targetAudience: string;
  keyServices?: Prisma.InputJsonValue;
  pricingGuidelines?: string;
  faq?: Prisma.InputJsonValue;
  scripts?: Prisma.InputJsonValue;
  dosAndDonts?: Prisma.InputJsonValue;
}

@Injectable()
export class BriefingsService {
  constructor(private readonly prisma: PrismaService) {}

  get(subAccountId: string) {
    return this.prisma.briefing.findUnique({ where: { subAccountId } });
  }

  async upsert(subAccountId: string, updatedBy: string, input: BriefingInput) {
    const existing = await this.prisma.briefing.findUnique({ where: { subAccountId } });
    const version = (existing?.version ?? 0) + 1;

    if (existing) {
      await this.prisma.briefingRevision.create({
        data: {
          subAccountId,
          version: existing.version,
          snapshot: existing as unknown as Prisma.InputJsonValue,
          updatedBy: existing.updatedBy,
        },
      });
    }

    return this.prisma.briefing.upsert({
      where: { subAccountId },
      update: {
        businessSummary: input.businessSummary,
        targetAudience: input.targetAudience,
        keyServices: input.keyServices ?? [],
        pricingGuidelines: input.pricingGuidelines,
        faq: input.faq ?? [],
        scripts: input.scripts ?? {},
        dosAndDonts: input.dosAndDonts ?? {},
        updatedBy,
        version,
      },
      create: {
        subAccountId,
        businessSummary: input.businessSummary,
        targetAudience: input.targetAudience,
        keyServices: input.keyServices ?? [],
        pricingGuidelines: input.pricingGuidelines,
        faq: input.faq ?? [],
        scripts: input.scripts ?? {},
        dosAndDonts: input.dosAndDonts ?? {},
        updatedBy,
        version,
      },
    });
  }
}
