import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  MetaGraphClient,
  buildAuthorizeUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  type OAuthConfig,
} from '@callwe/meta-ads-sdk';
import { Prisma } from '@callwe/db';
import { env } from '../../config/env.js';
import { IntegrationsService } from '../integrations/integrations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DEFAULT_FIELD_MAPPING = {
  name: 'full_name',
  phone: 'phone_number',
  email: 'email',
};

interface OAuthState {
  subAccountId: string;
  userId: string;
  ts: number;
}

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);

  constructor(
    private readonly integrations: IntegrationsService,
    private readonly prisma: PrismaService,
  ) {}

  private get oauthConfig(): OAuthConfig {
    if (!env.META_APP_ID || !env.META_APP_SECRET || !env.META_OAUTH_REDIRECT_URL) {
      throw new Error('Meta OAuth env vars not configured');
    }
    return {
      appId: env.META_APP_ID,
      appSecret: env.META_APP_SECRET,
      redirectUri: env.META_OAUTH_REDIRECT_URL,
      graphVersion: env.META_GRAPH_VERSION,
    };
  }

  private get stateSecret(): string {
    return env.META_OAUTH_STATE_SECRET ?? env.JWT_ACCESS_SECRET;
  }

  buildAuthorizeUrl(subAccountId: string, userId: string): string {
    const state = this.signState({ subAccountId, userId, ts: Date.now() });
    return buildAuthorizeUrl(this.oauthConfig, state);
  }

  async handleCallback(code: string, state: string): Promise<{ subAccountId: string }> {
    const parsed = this.verifyState(state);
    if (Date.now() - parsed.ts > 10 * 60_000) throw new Error('OAuth state expired');

    const short = await exchangeCodeForToken(this.oauthConfig, code);
    const long = await exchangeForLongLivedToken(this.oauthConfig, short.access_token);

    // Preserva credenciais já existentes (ex.: pageAccessToken/pageId do Messenger)
    // — reconectar só atualiza o user token, sem apagar o resto.
    const existing =
      (await this.integrations.getDecrypted<Record<string, unknown>>(parsed.subAccountId, 'meta_ads')) ?? {};
    await this.integrations.upsertCredentials(parsed.subAccountId, 'meta_ads', {
      ...existing,
      userAccessToken: long.access_token,
      tokenType: long.token_type,
      expiresIn: long.expires_in,
      issuedAt: Date.now(),
    });

    return { subAccountId: parsed.subAccountId };
  }

  async listPages(subAccountId: string) {
    const creds = await this.integrations.getDecrypted<{ userAccessToken: string }>(
      subAccountId,
      'meta_ads',
    );
    if (!creds) throw new Error('Meta Ads not connected');
    const client = new MetaGraphClient({
      accessToken: creds.userAccessToken,
      graphVersion: env.META_GRAPH_VERSION,
      appId: env.META_APP_ID,
      appSecret: env.META_APP_SECRET,
    });
    return client.listPages();
  }

  async listForms(_subAccountId: string, pageId: string, pageAccessToken: string) {
    const client = new MetaGraphClient({
      accessToken: pageAccessToken,
      graphVersion: env.META_GRAPH_VERSION,
    });
    return client.listForms(pageId, pageAccessToken);
  }

  async subscribeForm(
    subAccountId: string,
    input: {
      pageId: string;
      pageAccessToken: string;
      formId: string;
      formName: string;
      fieldMapping?: Record<string, string>;
    },
  ) {
    const integration = await this.prisma.integration.findUnique({
      where: { subAccountId_provider: { subAccountId, provider: 'meta_ads' } },
    });
    if (!integration) throw new Error('Meta Ads integration not found');

    const client = new MetaGraphClient({
      accessToken: input.pageAccessToken,
      graphVersion: env.META_GRAPH_VERSION,
    });
    await client.subscribePageWebhook(input.pageId, input.pageAccessToken);

    // Guarda o token da página (não expira, ao contrário do user token de ~60 dias)
    // para o worker conseguir buscar o lead depois. Mescla sem apagar o userAccessToken.
    const existing =
      (await this.integrations.getDecrypted<Record<string, unknown>>(subAccountId, 'meta_ads')) ?? {};
    await this.integrations.upsertCredentials(subAccountId, 'meta_ads', {
      ...existing,
      pageAccessToken: input.pageAccessToken,
      pageId: input.pageId,
    });

    return this.prisma.metaLeadForm.upsert({
      where: { pageId_formId: { pageId: input.pageId, formId: input.formId } },
      update: {
        formName: input.formName,
        enabled: true,
        fieldMapping: (input.fieldMapping ?? DEFAULT_FIELD_MAPPING) as Prisma.InputJsonValue,
      },
      create: {
        integrationId: integration.id,
        subAccountId,
        pageId: input.pageId,
        formId: input.formId,
        formName: input.formName,
        enabled: true,
        fieldMapping: (input.fieldMapping ?? DEFAULT_FIELD_MAPPING) as Prisma.InputJsonValue,
      },
    });
  }

  async unsubscribeForm(subAccountId: string, formId: string) {
    return this.prisma.metaLeadForm.updateMany({
      where: { subAccountId, formId },
      data: { enabled: false },
    });
  }

  listEnabledForms(subAccountId: string) {
    return this.prisma.metaLeadForm.findMany({
      where: { subAccountId, enabled: true },
      select: { id: true, pageId: true, formId: true, formName: true, enabled: true },
    });
  }

  // ---------- state signing (HMAC) ----------

  private signState(payload: OAuthState): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.stateSecret).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  private verifyState(state: string): OAuthState {
    const [body, sig] = state.split('.');
    if (!body || !sig) throw new Error('Invalid state');
    const expected = createHmac('sha256', this.stateSecret).update(body).digest('base64url');
    const ok = (() => {
      try {
        return timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url'));
      } catch {
        return false;
      }
    })();
    if (!ok) throw new Error('State signature invalid');
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthState;
  }
}
