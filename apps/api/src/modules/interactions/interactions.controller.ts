import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
import { ZodBody } from '../../common/pipes/zod.pipe.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type { Response } from 'express';
import type { Readable } from 'node:stream';
import axios from 'axios';
import { InteractionsService } from './interactions.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';
import { env } from '../../config/env.js';

const SendSmsDto = z.object({
  subAccountId: z.string().uuid(),
  toNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'número em E.164 (ex: +15551234567)'),
  text: z.string().min(1).max(1600),
});

@Controller('interactions')
@UseGuards(AuthGuard('jwt'))
export class InteractionsController {
  constructor(private readonly svc: InteractionsService) {}

  /** Lista interações do atendente logado (todas as subcontas que ele atende). */
  @Get('mine')
  async mine(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: string,
    @Query('onlyMine') onlyMine?: string,
  ) {
    const subAccountIds = user.memberships
      .map((m) => m.subAccountId)
      .filter((v): v is string => !!v);
    if (subAccountIds.length === 0) return [];
    return this.svc.list(subAccountIds, {
      type,
      agentUserId: onlyMine === 'true' ? user.id : undefined,
    });
  }

  /** KPIs do atendente logado — escopados nas subcontas que ele atende. */
  @Get('mine/stats')
  agentStats(@CurrentUser() user: AuthUser, @Query('onlyMine') onlyMine?: string) {
    const subAccountIds = user.memberships
      .map((m) => m.subAccountId)
      .filter((v): v is string => !!v);
    return this.svc.agentStats(subAccountIds, onlyMine === 'true' ? user.id : undefined);
  }

  /** Envia SMS via CloudTalk em nome do atendente logado. */
  @Post('sms/send')
  sendSms(
    @CurrentUser() user: AuthUser,
    @ZodBody(SendSmsDto) dto: z.infer<typeof SendSmsDto>,
  ) {
    return this.svc.sendSms(user.id, dto);
  }

  /** Detalhe de uma interação — valida via memberships do usuário (não exige TenantGuard). */
  @Get('mine/:id')
  async mineDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const subAccountIds = user.memberships
      .map((m) => m.subAccountId)
      .filter((v): v is string => !!v);
    const interaction = await this.svc.getAny(id);
    if (!interaction) throw new NotFoundException();
    if (!subAccountIds.includes(interaction.subAccountId)) throw new NotFoundException();
    return interaction;
  }

  @Get()
  @UseGuards(TenantGuard)
  list(@Req() req: { tenant: { subAccountId: string } }, @Query('type') type?: string) {
    return this.svc.list(req.tenant.subAccountId, { type });
  }

  @Get(':id')
  @UseGuards(TenantGuard)
  async get(
    @Req() req: { tenant: { subAccountId: string }; ip?: string },
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const interaction = await this.svc.get(req.tenant.subAccountId, id);
    if (interaction?.recordingUrl) {
      await this.svc.logRecordingAccess(id, user.id, req.ip);
    }
    return interaction;
  }

  /** Streams a gravação pro navegador (proxy R2 ou CloudTalk). */
  @Get(':id/recording')
  @UseGuards(TenantGuard)
  async recording(
    @Req() req: { tenant: { subAccountId: string }; ip?: string },
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const interaction = await this.svc.get(req.tenant.subAccountId, id);
    if (!interaction?.recordingUrl) throw new NotFoundException('Sem gravação');

    const url = interaction.recordingUrl;
    await this.svc.logRecordingAccess(id, user.id, req.ip);

    const isR2 =
      !!env.S3_BUCKET &&
      !!env.S3_ACCESS_KEY_ID &&
      !!env.S3_SECRET_ACCESS_KEY &&
      (url.includes('.r2.cloudflarestorage.com') || url.includes(env.S3_BUCKET));

    if (!isR2) {
      const upstream = await axios.get<Readable>(url, {
        responseType: 'stream',
        auth: {
          username: env.CLOUDTALK_API_KEY_ID,
          password: env.CLOUDTALK_API_KEY_SECRET,
        },
      });
      res.setHeader('Content-Type', String(upstream.headers['content-type'] ?? 'audio/mpeg'));
      res.setHeader('Accept-Ranges', 'bytes');
      upstream.data.pipe(res);
      return;
    }

    const u = new URL(url);
    let key = u.pathname.replace(/^\//, '');
    if (env.S3_BUCKET && key.startsWith(env.S3_BUCKET + '/')) {
      key = key.substring(env.S3_BUCKET.length + 1);
    }

    const s3 = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
    });

    const obj = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET!, Key: key }));
    const contentType = obj.ContentType ?? (key.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    if (obj.ContentLength) res.setHeader('Content-Length', String(obj.ContentLength));
    (obj.Body as Readable).pipe(res);
  }
}
