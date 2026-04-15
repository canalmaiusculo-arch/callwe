import { Controller, Delete, Get, Param, Post, Query, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { z } from 'zod';
import { MetaAdsService } from './meta-ads.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';
import { ZodBody } from '../../common/pipes/zod.pipe.js';
import { env } from '../../config/env.js';

const SubscribeFormDto = z.object({
  pageId: z.string(),
  pageAccessToken: z.string(),
  formId: z.string(),
  formName: z.string(),
  fieldMapping: z.record(z.string()).optional(),
});

@Controller('integrations/meta-ads')
export class MetaAdsOAuthController {
  constructor(private readonly svc: MetaAdsService) {}

  /** Inicia o fluxo OAuth — redireciona para o Facebook. Exige usuário logado + tenant. */
  @Get('connect')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  connect(
    @Req() req: { tenant: { subAccountId: string } },
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const url = this.svc.buildAuthorizeUrl(req.tenant.subAccountId, user.id);
    return res.redirect(url);
  }

  /** Callback do Facebook — público, mas validamos o `state` assinado. */
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (error) return res.redirect(`${env.APP_URL}/workspace/integrations?error=${encodeURIComponent(error)}`);
    if (!code || !state) throw new BadRequestException('Missing code or state');
    const { subAccountId } = await this.svc.handleCallback(code, state);
    return res.redirect(`${env.APP_URL}/workspace/integrations/meta-ads/forms?sub=${subAccountId}`);
  }

  /** Lista páginas do Facebook do usuário conectado (após OAuth). */
  @Get('pages')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  pages(@Req() req: { tenant: { subAccountId: string } }) {
    return this.svc.listPages(req.tenant.subAccountId);
  }

  /** Lista formulários de uma página específica. */
  @Get('pages/:pageId/forms')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  forms(
    @Req() req: { tenant: { subAccountId: string } },
    @Param('pageId') pageId: string,
    @Query('pageAccessToken') pageAccessToken: string,
  ) {
    if (!pageAccessToken) throw new BadRequestException('pageAccessToken required');
    return this.svc.listForms(req.tenant.subAccountId, pageId, pageAccessToken);
  }

  /** Lista formulários atualmente habilitados (já com webhook). */
  @Get('forms')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  enabledForms(@Req() req: { tenant: { subAccountId: string } }) {
    return this.svc.listEnabledForms(req.tenant.subAccountId);
  }

  /** Habilita um formulário (subscreve a página + cria MetaLeadForm). */
  @Post('forms/subscribe')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  subscribe(
    @Req() req: { tenant: { subAccountId: string } },
    @ZodBody(SubscribeFormDto) dto: z.infer<typeof SubscribeFormDto>,
  ) {
    return this.svc.subscribeForm(req.tenant.subAccountId, dto);
  }

  @Delete('forms/:formId')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  unsubscribe(
    @Req() req: { tenant: { subAccountId: string } },
    @Param('formId') formId: string,
  ) {
    return this.svc.unsubscribeForm(req.tenant.subAccountId, formId);
  }
}
