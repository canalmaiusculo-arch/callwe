import { Body, Controller, Get, Headers, HttpCode, Inject, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Queue } from 'bullmq';
import { verifyMetaSignature, type MetaWebhookPayload } from '@callwe/meta-ads-sdk';
import { Prisma } from '@callwe/db';
import { PrismaService } from '../prisma/prisma.service.js';
import { env } from '../../config/env.js';

@Controller('webhooks/meta')
export class MetaAdsWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('META_LEADGEN_QUEUE') private readonly leadgenQueue: Queue,
    @Inject('META_MESSENGER_QUEUE') private readonly messengerQueue: Queue,
  ) {}

  // Verificação inicial (Meta envia GET com hub.challenge ao registrar webhook)
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (mode === 'subscribe' && token === env.META_WEBHOOK_VERIFY_TOKEN) {
      return challenge;
    }
    return 'invalid';
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: MetaWebhookPayload,
  ) {
    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(body);
    const valid = env.META_APP_SECRET ? verifyMetaSignature(raw, signature, env.META_APP_SECRET) : false;

    await this.prisma.webhookInbox.create({
      data: {
        provider: 'meta',
        eventType: String(body.object ?? 'unknown'),
        signatureValid: valid,
        headers: { 'x-hub-signature-256': signature ?? null },
        body: body as unknown as Prisma.InputJsonValue,
      },
    });

    if (valid && (body.object === 'page' || body.object === 'instagram')) {
      const channel = body.object === 'instagram' ? 'instagram' : 'messenger';
      for (const entry of body.entry ?? []) {
        // Leads (formulários) — usam `changes`.
        for (const change of entry.changes ?? []) {
          if (change.field !== 'leadgen') continue;
          await this.leadgenQueue.add('lead', {
            leadgenId: change.value.leadgen_id,
            pageId: change.value.page_id,
            formId: change.value.form_id,
            adId: change.value.ad_id,
          });
        }

        // Mensagens (Messenger/Instagram) — usam `messaging`.
        for (const ev of entry.messaging ?? []) {
          // Ignora ecos das nossas próprias mensagens enviadas e eventos sem texto/anexo.
          if (ev.message?.is_echo) continue;
          if (!ev.message) continue;
          await this.messengerQueue.add('message', {
            pageId: entry.id,
            psid: ev.sender.id,
            channel,
            mid: ev.message.mid,
            text: ev.message.text ?? null,
            attachments: ev.message.attachments ?? null,
            timestamp: ev.timestamp,
          });
        }
      }
    }

    return { received: true };
  }
}
