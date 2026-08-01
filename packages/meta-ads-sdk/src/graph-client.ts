import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import type { MetaLead, MetaLeadForm, MetaPage } from './types.js';

export interface GraphClientOptions {
  accessToken: string;
  graphVersion?: string;
}

export class MetaGraphClient {
  readonly http: AxiosInstance;
  private readonly version: string;

  constructor(opts: GraphClientOptions) {
    this.version = opts.graphVersion ?? 'v20.0';
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

  async listPages(userId = 'me'): Promise<MetaPage[]> {
    const res = await this.http.get(`/${userId}/accounts`, {
      params: { fields: 'id,name,access_token,category,tasks', limit: 100 },
    });
    return (res.data?.data as MetaPage[]) ?? [];
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
