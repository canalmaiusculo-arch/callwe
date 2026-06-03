import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { LeadSource, type Prisma } from '@callwe/db';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service.js';
import { LeadsService } from '../leads/leads.service.js';
import { ZodBody } from '../../common/pipes/zod.pipe.js';

const ZapierLeadDto = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  source: z.enum(['meta_ads', 'sms', 'manual', 'api', 'import']).optional(),
  sourceRef: z.string().optional(),
  formName: z.string().optional(),
  campaignName: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

@Controller('webhooks/zapier')
export class ZapierWebhookController {
  private readonly logger = new Logger(ZapierWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
  ) {}

  /**
   * Endpoint público — Zapier (ou qualquer integração) manda POST com
   * `X-CallWe-Api-Key` no header e dados do lead no body. Resolvemos
   * a sub-account pela API key e criamos/upsertamos o lead.
   */
  @Post('leads')
  @HttpCode(202)
  async receive(
    @Headers('x-callwe-api-key') apiKey: string | undefined,
    @ZodBody(ZapierLeadDto) body: z.infer<typeof ZapierLeadDto>,
  ) {
    if (!apiKey || apiKey.length < 16) {
      throw new UnauthorizedException('API key required');
    }

    const sub = await this.prisma.subAccount.findFirst({
      where: { settings: { path: ['zapierApiKey'], equals: apiKey } },
      select: { id: true, name: true },
    });
    if (!sub) {
      this.logger.warn(`Zapier webhook with invalid API key (prefix=${apiKey.slice(0, 6)}...)`);
      throw new UnauthorizedException('Invalid API key');
    }

    const phoneE164 = normalizePhoneToE164(body.phone);
    const source = (body.source ?? 'meta_ads') as LeadSource;

    // customFields agrega tudo que veio do Zapier que não bate em colunas fixas
    const customFields: Prisma.InputJsonValue = {
      ...(body.customFields ?? {}),
      ...(body.formName ? { formName: body.formName } : {}),
      ...(body.campaignName ? { campaignName: body.campaignName } : {}),
      ...(body.source ? { acquisitionChannel: body.source } : { acquisitionChannel: 'meta_ads' }),
      receivedVia: 'zapier',
    };

    // Se temos phone, faz upsert pra não duplicar lead do mesmo número
    if (phoneE164) {
      const lead = await this.leadsService.upsertByPhone(sub.id, phoneE164, {
        source,
        sourceRef: body.sourceRef,
        name: body.name?.trim(),
        email: body.email,
        customFields,
      });
      this.logger.log(`Zapier lead recebido pra ${sub.name}: ${phoneE164} → lead ${lead.id}`);
      return { received: true, leadId: lead.id, subAccount: sub.name };
    }

    // Sem phone: cria lead sempre (não dá pra dedup)
    const lead = await this.leadsService.create(sub.id, {
      source,
      sourceRef: body.sourceRef,
      name: body.name?.trim(),
      email: body.email,
      customFields,
    });
    this.logger.log(`Zapier lead sem phone recebido pra ${sub.name}: lead ${lead.id}`);
    return { received: true, leadId: lead.id, subAccount: sub.name };
  }
}

function normalizePhoneToE164(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('+')) {
    // já E164
    if (/^\+[1-9]\d{6,14}$/.test(digits)) return digits;
    return undefined;
  }
  // Telefones BR comuns: 11 dígitos (DDD + 9 + número) → adiciona +55
  if (digits.length === 11 || digits.length === 10) return `+55${digits}`;
  // 13 dígitos (já com 55) ou 12 (55 + 10) → só adiciona +
  if (digits.length === 12 || digits.length === 13) return `+${digits}`;
  // Outros formatos: tenta com + na frente, valida E164
  const candidate = `+${digits}`;
  if (/^\+[1-9]\d{6,14}$/.test(candidate)) return candidate;
  throw new BadRequestException(`Telefone inválido: ${raw}`);
}
