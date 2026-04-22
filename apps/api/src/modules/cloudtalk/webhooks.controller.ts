import { Body, Controller, Headers, HttpCode, Inject, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Queue } from 'bullmq';
import { verifyCloudtalkSignature } from '@callwe/cloudtalk-sdk';
import { Prisma } from '@callwe/db';
import { PrismaService } from '../prisma/prisma.service.js';
import { env } from '../../config/env.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

@Controller('webhooks/cloudtalk')
export class CloudtalkWebhooksController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    @Inject('CLOUDTALK_WEBHOOK_QUEUE') private readonly queue: Queue,
  ) {}

  @Post()
  @HttpCode(202)
  async receive(
    @Headers('x-cloudtalk-signature') signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: Record<string, unknown>,
  ) {
    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(body);
    const valid = verifyCloudtalkSignature(raw, signature, env.CLOUDTALK_WEBHOOK_SECRET);

    const inbox = await this.prisma.webhookInbox.create({
      data: {
        provider: 'cloudtalk',
        eventType: String(body.event_type ?? body.type ?? 'unknown'),
        signatureValid: valid,
        headers: { signature: signature ?? null },
        body: body as Prisma.InputJsonValue,
      },
    });

    // Sempre enfileira — worker é responsável por descobrir a subconta pelo número.
    // Se assinatura inválida, marcamos no inbox mas processamos mesmo assim
    // (CloudTalk pode estar configurado sem secret durante setup inicial).
    await this.queue.add('process', { inboxId: inbox.id });

    // Realtime imediato: chamada entrante → painel do atendente já vê.
    if (body.event_type === 'call.started' || body.event_type === 'call_started') {
      const sub = await this.resolveSubAccountFromBody(body);
      if (sub) {
        this.realtime.emitIncomingCall(sub.cloudtalkTag, {
          ...body,
          subAccountId: sub.id,
          subAccountName: sub.name,
        });
      }
    }

    return { received: true };
  }

  private async resolveSubAccountFromBody(body: Record<string, unknown>) {
    // Para inbound, internal_number é o número que recebeu. Para outbound, internal_number é o que discou.
    // Tentamos os dois (external_number também) porque o Melo General pode aparecer como external em outbound.
    const candidates = [
      normalizeE164(String(body.internal_number ?? body.to_number ?? '')),
      normalizeE164(String(body.external_number ?? body.from_number ?? '')),
    ].filter(Boolean);
    if (candidates.length === 0) return null;
    const pn = await this.prisma.phoneNumber.findFirst({
      where: { e164: { in: candidates }, status: 'active' },
      include: { subAccount: true },
    });
    return pn?.subAccount ?? null;
  }
}

function normalizeE164(num: string): string {
  if (!num) return '';
  const digits = num.trim().replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? digits : `+${digits}`;
}
