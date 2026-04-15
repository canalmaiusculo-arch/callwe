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

    if (valid && body.object === 'page') {
      // Cada leadgen em paralelo — Graph API lookup é independente.
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== 'leadgen') continue;
          await this.leadgenQueue.add('lead', {
            leadgenId: change.value.leadgen_id,
            pageId: change.value.page_id,
            formId: change.value.form_id,
            adId: change.value.ad_id,
          });
        }
      }
    }

    return { received: true };
  }
}
