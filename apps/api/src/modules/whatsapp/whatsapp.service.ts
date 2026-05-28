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

  /** Carrega interaction, valida acesso, monta mensagem e envia pro grupo da sub_account. */
  async sendInteractionSummary(userId: string, interactionId: string): Promise<{ sent: true; phone: string }> {
    const interaction = await this.prisma.interaction.findUnique({
      where: { id: interactionId },
      include: { subAccount: true, lead: true, agent: { select: { fullName: true } } },
    });
    if (!interaction) throw new BadRequestException('Interação não encontrada');

    // Valida que o usuário atende essa sub_account.
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

    const summary = interaction.aiSummary?.trim();
    if (!summary) throw new BadRequestException('Sem resumo IA pra essa chamada ainda');

    const leadName = interaction.lead?.name ?? interaction.fromNumber ?? 'Lead';
    const agentName = interaction.agent?.fullName ?? 'Atendente';
    const startedAt = interaction.startedAt.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
    const duration = interaction.durationSeconds
      ? `${Math.floor(interaction.durationSeconds / 60)}m${interaction.durationSeconds % 60}s`
      : '—';

    const message = [
      `📞 *Resumo de chamada — ${interaction.subAccount.name}*`,
      ``,
      `*Lead:* ${leadName}`,
      `*Atendente:* ${agentName}`,
      `*Quando:* ${startedAt}`,
      `*Duração:* ${duration}`,
      ``,
      summary,
    ].join('\n');

    await this.sendText(phone, message);
    return { sent: true, phone };
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
