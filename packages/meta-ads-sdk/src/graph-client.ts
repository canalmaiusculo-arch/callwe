import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import type { MetaLead, MetaLeadForm, MetaPage } from './types.js';

export interface GraphClientOptions {
  accessToken: string;
  graphVersion?: string;
  appId?: string;
  appSecret?: string;
}

export class MetaGraphClient {
  readonly http: AxiosInstance;
  private readonly version: string;
  private readonly accessToken: string;
  private readonly appAccessToken?: string;

  constructor(opts: GraphClientOptions) {
    this.version = opts.graphVersion ?? 'v20.0';
    this.accessToken = opts.accessToken;
    this.appAccessToken =
      opts.appId && opts.appSecret ? `${opts.appId}|${opts.appSecret}` : undefined;
    this.http = axios.create({
      baseURL: `https://graph.facebook.com/${this.version}`,
      timeout: 15_000,
      params: { access_token: opts.accessToken },
    });
    axiosRetry(this.http, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (err) => {
        const s = err.response?.status;
        return axiosRetry.isNetworkError(err) || s === 429 || (s !== undefined && s >= 500);
      },
    });
  }

  /**
   * IDs de páginas concedidas pelo seletor granular do Facebook Login. Páginas de
   * Portfólio de Negócios não aparecem em /me/accounts, mas ficam registradas nos
   * `granular_scopes` do token (obtidos via debug_token).
   */
  private async grantedPageIds(): Promise<string[]> {
    try {
      const res = await this.http.get('/debug_token', {
        params: {
          input_token: this.accessToken,
          access_token: this.appAccessToken ?? this.accessToken,
        },
      });
      const granular = res.data?.data?.granular_scopes as
        | Array<{ scope: string; target_ids?: string[] }>
        | undefined;
      const ids = new Set<string>();
      for (const g of granular ?? []) for (const id of g.target_ids ?? []) ids.add(id);
      return [...ids];
    } catch {
      return [];
    }
  }

  /**
   * Lista páginas acessíveis: as de gestão clássica (/me/accounts) somadas às
   * concedidas via seletor granular (portfólio), buscadas pelo nó da página.
   */
  async listPages(userId = 'me'): Promise<MetaPage[]> {
    const byId = new Map<string, MetaPage>();

    try {
      const res = await this.http.get(`/${userId}/accounts`, {
        params: { fields: 'id,name,access_token,category', limit: 100 },
      });
      for (const p of (res.data?.data as MetaPage[]) ?? []) byId.set(p.id, p);
    } catch {
      // conta pode não ter páginas de gestão clássica — segue para as granulares
    }

    const granted = await this.grantedPageIds();
    for (const id of granted) {
      if (byId.has(id)) continue;
      try {
        const pr = await this.http.get(`/${id}`, {
          params: { fields: 'id,name,access_token,category' },
        });
        const page = pr.data as MetaPage;
        if (page?.id) byId.set(page.id, page);
      } catch {
        // sem acesso a esta página específica — ignora
      }
    }

    return [...byId.values()];
  }

  async listForms(pageId: string, pageAccessToken: string): Promise<MetaLeadForm[]> {
    const res = await this.http.get(`/${pageId}/leadgen_forms`, {
      params: { access_token: pageAccessToken, fields: 'id,name,status', limit: 100 },
    });
    return (res.data?.data as MetaLeadForm[]) ?? [];
  }

  async getLead(leadgenId: string): Promise<MetaLead> {
    const res = await this.http.get(`/${leadgenId}`, {
      params: { fields: 'id,created_time,ad_id,form_id,field_data' },
    });
    return res.data as MetaLead;
  }

  /** Subscreve a página ao app para receber webhooks de leadgen. */
  async subscribePageWebhook(pageId: string, pageAccessToken: string): Promise<void> {
    await this.http.post(
      `/${pageId}/subscribed_apps`,
      {},
      {
        params: { access_token: pageAccessToken, subscribed_fields: 'leadgen' },
      },
    );
  }

  /** Subscreve a página aos campos de mensageria (Messenger). */
  async subscribePageMessaging(pageId: string, pageAccessToken: string): Promise<void> {
    await this.http.post(
      `/${pageId}/subscribed_apps`,
      {},
      {
        params: {
          access_token: pageAccessToken,
          subscribed_fields: 'messages,messaging_postbacks,message_reads,messaging_referrals',
        },
      },
    );
  }

  /** Perfil público do usuário do Messenger (PSID). Requer page access token. */
  async getMessengerProfile(
    psid: string,
    pageAccessToken: string,
  ): Promise<{ name?: string; first_name?: string; last_name?: string; profile_pic?: string }> {
    try {
      const res = await this.http.get(`/${psid}`, {
        params: { access_token: pageAccessToken, fields: 'name,first_name,last_name,profile_pic' },
      });
      return res.data ?? {};
    } catch {
      // Perfil pode não estar acessível (usuário sem permissão de perfil) — segue sem nome.
      return {};
    }
  }

  /** Obtém um Page Access Token fresco a partir do user token (evita token vazio/expirado). */
  async getPageToken(pageId: string): Promise<string | null> {
    const res = await this.http.get(`/${pageId}`, { params: { fields: 'access_token' } });
    return (res.data?.access_token as string | undefined) ?? null;
  }

  /**
   * Busca o thread completo de uma conversa (como o inbox nativo), incluindo
   * respostas automáticas e mensagens enviadas por fora do painel. Filtra a
   * conversa pelo PSID do cliente via `user_id`.
   */
  async getConversationMessages(
    pageId: string,
    pageAccessToken: string,
    psid: string,
    limit = 100,
  ): Promise<Array<{ id: string; message?: string; created_time?: string; from?: { id: string; name?: string } }>> {
    const res = await this.http.get(`/${pageId}/conversations`, {
      params: {
        access_token: pageAccessToken,
        user_id: psid,
        fields: `messages.limit(${limit}){message,from,created_time}`,
      },
    });
    const conv = res.data?.data?.[0];
    return (conv?.messages?.data ?? []) as Array<{
      id: string;
      message?: string;
      created_time?: string;
      from?: { id: string; name?: string };
    }>;
  }

  /** Envia uma mensagem de texto via Send API (Messenger). */
  async sendMessengerText(
    pageId: string,
    pageAccessToken: string,
    psid: string,
    text: string,
    messagingType: 'RESPONSE' | 'MESSAGE_TAG' = 'RESPONSE',
    tag?: string,
  ): Promise<{ message_id?: string; recipient_id?: string }> {
    const res = await this.http.post(
      `/${pageId}/messages`,
      {
        recipient: { id: psid },
        messaging_type: messagingType,
        message: { text },
        ...(tag ? { tag } : {}),
      },
      { params: { access_token: pageAccessToken } },
    );
    return res.data ?? {};
  }

  async unsubscribePageWebhook(pageId: string, pageAccessToken: string): Promise<void> {
    await this.http.delete(`/${pageId}/subscribed_apps`, {
      params: { access_token: pageAccessToken },
    });
  }
}
