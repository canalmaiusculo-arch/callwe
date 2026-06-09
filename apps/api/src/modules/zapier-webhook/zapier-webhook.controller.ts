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
import { PrismaService } from '../prisma/prisma.service.js';
import { LeadsService } from '../leads/leads.service.js';

// Mapa de aliases comuns que o Zapier envia → chave canônica do CallWe.
// Case-insensitive e ignora espaços/underscores/hifens.
const FIELD_ALIASES: Record<string, 'name' | 'phone' | 'email' | 'source' | 'sourceRef' | 'formName' | 'campaignName'> = {
  name: 'name',
  fullname: 'name',
  full_name: 'name',
  leadname: 'name',
  customername: 'name',

  phone: 'phone',
  phonenumber: 'phone',
  phone_number: 'phone',
  telefone: 'phone',
  mobile: 'phone',
  cell: 'phone',
  whatsapp: 'phone',

  email: 'email',
  emailaddress: 'email',
  email_address: 'email',
  mail: 'email',

  source: 'source',
  channel: 'source',
  acquisitionchannel: 'source',

  sourceref: 'sourceRef',
  leadid: 'sourceRef',
  lead_id: 'sourceRef',
  externalid: 'sourceRef',

  formname: 'formName',
  form_name: 'formName',
  form: 'formName',
  formulario: 'formName',

  campaignname: 'campaignName',
  campaign_name: 'campaignName',
  campaign: 'campaignName',
  adname: 'campaignName',
  anuncio: 'campaignName',
};

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[\s_\-.]/g, '');
}

interface NormalizedBody {
  name?: string;
  phone?: string;
  email?: string;
  source?: LeadSource;
  sourceRef?: string;
  formName?: string;
  campaignName?: string;
  customFields: Record<string, unknown>;
}

const VALID_SOURCES = new Set(['meta_ads', 'sms', 'manual', 'api', 'import', 'form']);

function normalizeBody(raw: Record<string, unknown>): NormalizedBody {
  const out: NormalizedBody = { customFields: {} };

  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined || value === '') continue;

    const normKey = normalizeKey(key);
    const canonical = FIELD_ALIASES[normKey];

    if (canonical === 'source') {
      const str = String(value).toLowerCase().trim();
      if (VALID_SOURCES.has(str)) out.source = str as LeadSource;
      else out.customFields[key] = value;
      continue;
    }
    if (canonical) {
      const str = String(value).trim();
      if (str) out[canonical] = str;
      continue;
    }

    // Campo não reconhecido — vai pra customFields preservando o nome original do Zapier
    out.customFields[key] = value;
  }

  return out;
}

@Controller('webhooks')
export class ZapierWebhookController {
  private readonly logger = new Logger(ZapierWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
  ) {}

  /**
   * Webhook genérico de formulários/quizz. A ferramenta externa (Typeform,
   * Jotform, quizz próprio, landing page, etc.) faz POST direto aqui com
   * `X-CallWe-Api-Key` no header. Leads entram com source `form`.
   */
  @Post('leads')
  @HttpCode(202)
  receiveForm(
    @Headers('x-callwe-api-key') apiKey: string | undefined,
    @Body() rawBody: Record<string, unknown>,
  ) {
    return this.ingestLead(apiKey, rawBody, 'form' as LeadSource, 'form_webhook');
  }

  /**
   * Alias legado — usado enquanto o app Meta estava em review (Zapier
   * disparando leads do Facebook). Mantido pra não quebrar integrações
   * existentes; default de fonte continua `meta_ads`.
   */
  @Post('zapier/leads')
  @HttpCode(202)
  receiveZapier(
    @Headers('x-callwe-api-key') apiKey: string | undefined,
    @Body() rawBody: Record<string, unknown>,
  ) {
    return this.ingestLead(apiKey, rawBody, 'meta_ads' as LeadSource, 'zapier');
  }

  /**
   * Resolve a sub-account pela API key e cria/upserta o lead. `defaultSource`
   * é usado quando o payload não traz um campo `source` válido.
   */
  private async ingestLead(
    apiKey: string | undefined,
    rawBody: Record<string, unknown>,
    defaultSource: LeadSource,
    receivedVia: string,
  ) {
    if (!apiKey || apiKey.length < 16) {
      throw new UnauthorizedException('API key required');
    }

    const sub = await this.prisma.subAccount.findFirst({
      where: { settings: { path: ['zapierApiKey'], equals: apiKey } },
      select: { id: true, name: true },
    });
    if (!sub) {
      this.logger.warn(`Webhook with invalid API key (prefix=${apiKey.slice(0, 6)}...)`);
      throw new UnauthorizedException('Invalid API key');
    }

    const body = normalizeBody(rawBody ?? {});
    const phoneE164 = normalizePhoneToE164(body.phone);
    const source = body.source ?? defaultSource;

    // customFields preserva campos extras + adiciona metadata útil
    const customFields: Prisma.InputJsonValue = {
      ...body.customFields,
      ...(body.formName ? { formName: body.formName } : {}),
      ...(body.campaignName ? { campaignName: body.campaignName } : {}),
      acquisitionChannel: source,
      receivedVia,
    };

    if (phoneE164) {
      const lead = await this.leadsService.upsertByPhone(sub.id, phoneE164, {
        source,
        sourceRef: body.sourceRef,
        name: body.name,
        email: body.email,
        customFields,
      });
      this.logger.log(`Lead via ${receivedVia} pra ${sub.name}: ${phoneE164} → lead ${lead.id}`);
      return { received: true, leadId: lead.id, subAccount: sub.name };
    }

    const lead = await this.leadsService.create(sub.id, {
      source,
      sourceRef: body.sourceRef,
      name: body.name,
      email: body.email,
      customFields,
    });
    this.logger.log(`Lead via ${receivedVia} sem phone pra ${sub.name}: lead ${lead.id}`);
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
