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
      const subTag = await this.resolveSubTagFromBody(body);
      if (subTag) this.realtime.emitIncomingCall(subTag, body);
    }

    return { received: true };
  }

  private async resolveSubTagFromBody(body: Record<string, unknown>): Promise<string | null> {
    const isInbound = body.type === 'incoming' || body.type === 'inbound';
    const numberRaw = String((isInbound ? body.to_number : body.from_number) ?? '');
    if (!numberRaw) return null;
    const e164 = numberRaw.startsWith('+') ? numberRaw : `+${numberRaw.replace(/[^\d]/g, '')}`;
    const pn = await this.prisma.phoneNumber.findFirst({
      where: { e164, status: 'active' },
      include: { subAccount: true },
    });
    return pn?.subAccount?.cloudtalkTag ?? null;
  }
}
