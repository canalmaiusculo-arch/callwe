import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LeadsService } from '../leads/leads.service.js';

/**
 * Endpoint chamado pelo HTTP Request Step do Call Flow Designer
 * ANTES da chamada tocar. Retorna dados de briefing + lead para
 * o CloudTalk popular CueCards / routing.
 */
@Controller('cloudtalk/call-flow')
export class CallFlowController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: LeadsService,
  ) {}

  @Post('incoming')
  async incoming(@Body() body: { from: string; to: string; tag?: string }) {
    const subAccount = body.tag
      ? await this.prisma.subAccount.findUnique({ where: { cloudtalkTag: body.tag } })
      : null;
    if (!subAccount) return { action: 'continue' };

    const briefing = await this.prisma.briefing.findUnique({
      where: { subAccountId: subAccount.id },
      select: { businessSummary: true, scripts: true },
    });

    const lead = body.from
      ? await this.prisma.lead.findFirst({
          where: { subAccountId: subAccount.id, phoneE164: body.from, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        })
      : null;

    return {
      action: 'continue',
      context: {
        subAccount: { id: subAccount.id, name: subAccount.name },
        briefing,
        lead: lead
          ? { id: lead.id, name: lead.name, status: lead.status }
          : null,
      },
    };
  }
}
