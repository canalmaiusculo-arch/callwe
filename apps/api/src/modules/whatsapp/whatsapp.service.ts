import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service.js';
import { env } from '../../config/env.js';

interface ZapiGroup {
  phone: string;
  name: string;
  isGroup: boolean;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get baseUrl(): string {
    if (!env.ZAPI_INSTANCE_ID || !env.ZAPI_TOKEN) {
      throw new BadRequestException('Z-API não configurada — defina ZAPI_INSTANCE_ID e ZAPI_TOKEN');
    }
    return `https://api.z-api.io/instances/${env.ZAPI_INSTANCE_ID}/token/${env.ZAPI_TOKEN}`;
  }

  private get headers(): Record<string, string> {
    if (!env.ZAPI_CLIENT_TOKEN) {
      throw new BadRequestException('ZAPI_CLIENT_TOKEN não configurado');
    }
    return {
      'Client-Token': env.ZAPI_CLIENT_TOKEN,
      'Content-Type': 'application/json',
    };
  }

  /** Lista grupos do número conectado (usado pra dropdown de configuração). */
  async listGroups(): Promise<ZapiGroup[]> {
    try {
      const res = await axios.get<unknown>(`${this.baseUrl}/groups`, {
        headers: this.headers,
        timeout: 15_000,
      });
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map((g) => {
        const obj = g as Record<string, unknown>;
        return {
          phone: String(obj.phone ?? obj.id ?? ''),
          name: String(obj.name ?? obj.subject ?? '(sem nome)'),
          isGroup: true,
        };
      });
    } catch (err) {
      this.logger.error(`Z-API listGroups falhou: ${this.formatError(err)}`);
      throw new BadRequestException(`Z-API recusou: ${this.formatError(err)}`);
    }
  }

  /** Envia mensagem de texto pra um número/grupo (formato Z-API: id sem @g.us). */
  async sendText(phone: string, message: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/send-text`,
        { phone, message },
        { headers: this.headers, timeout: 20_000 },
      );
    } catch (err) {
      this.logger.error(`Z-API send-text falhou (phone=${phone}): ${this.formatError(err)}`);
      throw new BadRequestException(`Z-API recusou o envio: ${this.formatError(err)}`);
    }
  }

  /** Carrega interaction, valida acesso, monta mensagem (varia por cenário) e envia pro grupo da sub_account. */
  async sendInteractionSummary(userId: string, interactionId: string): Promise<{ sent: true; phone: string; scenario: string }> {
    const interaction = await this.prisma.interaction.findUnique({
      where: { id: interactionId },
      include: { subAccount: true, lead: true, agent: { select: { fullName: true } } },
    });
    if (!interaction) throw new BadRequestException('Interação não encontrada');

    const membership = await this.prisma.membership.findFirst({
      where: { userId, subAccountId: interaction.subAccountId },
      select: { id: true },
    });
    if (!membership) throw new BadRequestException('Você não atende esse cliente');

    const settings = (interaction.subAccount.settings ?? {}) as Record<string, unknown>;
    const phone = String(settings.whatsappGroupId ?? '').trim();
    if (!phone) {
      throw new BadRequestException(
        'Grupo WhatsApp não configurado pra esse cliente — peça pro admin configurar.',
      );
    }

    const scenario = classifyInteraction(interaction);
    if (scenario === 'unsupported') {
      throw new BadRequestException(
        'Essa chamada não tem report disponível ainda. Aguarde a transcrição completar.',
      );
    }

    const message = buildMessage(scenario, interaction);
    await this.sendText(phone, message);
    return { sent: true, phone, scenario };
  }

  private formatError(err: unknown): string {
    if (err instanceof AxiosError) {
      const data = err.response?.data;
      const status = err.response?.status ?? '???';
      const body = typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data ?? err.message);
      return `HTTP ${status} ${body}`;
    }
    return (err as Error)?.message ?? 'erro desconhecido';
  }
}

type Scenario = 'summary' | 'missed_inbound' | 'outbound_unanswered' | 'unsupported';

interface InteractionForWhatsapp {
  type: string;
  direction: string;
  status: string;
  startedAt: Date;
  durationSeconds: number | null;
  fromNumber: string | null;
  toNumber: string | null;
  aiSummary: string | null;
  subAccount: { name: string };
  lead: { name: string | null; phoneE164: string | null } | null;
  agent: { fullName: string } | null;
}

export function classifyInteraction(i: InteractionForWhatsapp): Scenario {
  if (i.type !== 'call') return 'unsupported';
  const summary = i.aiSummary?.trim();
  if (summary) return 'summary';
  if (i.direction === 'inbound' && i.status === 'missed') return 'missed_inbound';
  if (i.direction === 'outbound' && (!i.durationSeconds || i.durationSeconds < 5)) {
    return 'outbound_unanswered';
  }
  return 'unsupported';
}

function buildMessage(scenario: Scenario, i: InteractionForWhatsapp): string {
  const leadName = i.lead?.name?.trim();
  const leadPhone = i.lead?.phoneE164 ?? (i.direction === 'inbound' ? i.fromNumber : i.toNumber) ?? '—';
  const leadLabel = leadName ? `${leadName} (${leadPhone})` : leadPhone;
  const when = i.startedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const agentName = i.agent?.fullName ?? 'Equipe';
  const sub = i.subAccount.name;

  if (scenario === 'summary') {
    const duration = i.durationSeconds
      ? `${Math.floor(i.durationSeconds / 60)}m${i.durationSeconds % 60}s`
      : '—';
    return [
      `📞 *Resumo de chamada — ${sub}*`,
      ``,
      `*Lead:* ${leadLabel}`,
      `*Atendente:* ${agentName}`,
      `*Quando:* ${when}`,
      `*Duração:* ${duration}`,
      ``,
      i.aiSummary?.trim() ?? '',
    ].join('\n');
  }

  if (scenario === 'missed_inbound') {
    return [
      `📵 *Chamada perdida — ${sub}*`,
      ``,
      `*Lead:* ${leadLabel}`,
      `*Quando:* ${when}`,
      ``,
      `Ligou e a chamada foi perdida. Vamos retornar em breve.`,
    ].join('\n');
  }

  // outbound_unanswered
  return [
    `↩️ *Tentativa de retorno — ${sub}*`,
    ``,
    `*Lead:* ${leadLabel}`,
    `*Atendente:* ${agentName}`,
    `*Quando:* ${when}`,
    ``,
    `Tentamos contato mas não foi atendido. Vamos tentar novamente.`,
  ].join('\n');
}
