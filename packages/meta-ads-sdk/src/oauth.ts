import axios from 'axios';
import type { MetaTokenResponse } from './types.js';

export interface OAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  graphVersion?: string;
}

const SCOPES = [
  'email',
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'leads_retrieval',
  'ads_management',
];

export function buildAuthorizeUrl(cfg: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.redirectUri,
    state,
    scope: SCOPES.join(','),
    response_type: 'code',
  });
  return `https://www.facebook.com/${cfg.graphVersion ?? 'v20.0'}/dialog/oauth?${params}`;
}

export async function exchangeCodeForToken(
  cfg: OAuthConfig,
  code: string,
): Promise<MetaTokenResponse> {
  const res = await axios.get(
    `https://graph.facebook.com/${cfg.graphVersion ?? 'v20.0'}/oauth/access_token`,
    {
      params: {
        client_id: cfg.appId,
        client_secret: cfg.appSecret,
        redirect_uri: cfg.redirectUri,
        code,
      },
    },
  );
  return res.data as MetaTokenResponse;
}

/** Troca o token de curta duração (~1h) por um de longa (~60d). */
export async function exchangeForLongLivedToken(
  cfg: OAuthConfig,
  shortToken: string,
): Promise<MetaTokenResponse> {
  const res = await axios.get(
    `https://graph.facebook.com/${cfg.graphVersion ?? 'v20.0'}/oauth/access_token`,
    {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: cfg.appId,
        client_secret: cfg.appSecret,
        fb_exchange_token: shortToken,
      },
    },
  );
  return res.data as MetaTokenResponse;
}
