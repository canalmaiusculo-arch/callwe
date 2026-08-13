'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Facebook, Phone, MessageCircle, Webhook, MessagesSquare, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenantStore } from '@/stores/tenant-store';
import { HelpHint } from '@/components/help-hint';
import { useTranslate } from '@/i18n/provider';

interface Integration {
  id: string;
  provider: 'meta_ads' | 'whatsapp_cloud' | 'google_ads' | 'zapier';
  status: 'connected' | 'disconnected' | 'error';
  lastSyncAt: string | null;
  lastError: string | null;
}

const PROVIDERS = [
  {
    key: 'meta_ads' as const,
    name: 'Meta Ads (Facebook Lead Ads)',
    descriptionKey: 'integrations.metaAdsDescription',
    icon: Facebook,
    connectPath: '/integrations/meta-ads/connect',
  },
  {
    key: 'whatsapp_cloud' as const,
    name: 'WhatsApp Business',
    descriptionKey: 'integrations.whatsappDescription',
    icon: MessageCircle,
    connectPath: '/integrations/whatsapp/connect',
  },
];

async function startConnect(connectPath: string) {
  try {
    const res = await apiClient.get<{ authorizeUrl: string }>(connectPath);
    if (!res.authorizeUrl) throw new Error('Backend não retornou authorizeUrl');
    window.location.href = res.authorizeUrl;
  } catch (err) {
    toast.error((err as Error).message ?? 'Falha ao iniciar conexão');
  }
}

export default function IntegrationsPage() {
  const { t } = useTranslate();
  const { data: integrations = [] } = useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: () => apiClient.get<Integration[]>('/integrations'),
  });

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">{t('integrations.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('integrations.subtitle')}</p>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5" />
              <div>
                <CardTitle>CloudTalk</CardTitle>
                <CardDescription>{t('integrations.cloudtalkDescription')}</CardDescription>
              </div>
              <Badge variant="success" className="ml-auto">{t('integrations.statusActive')}</Badge>
            </div>
          </CardHeader>
        </Card>

        {PROVIDERS.map((p) => (
          <ProviderCard key={p.key} provider={p} inst={integrations.find((i) => i.provider === p.key)} />
        ))}

        <MessengerCard />
        <FormWebhookCard />
      </div>
    </div>
  );
}

type Provider = (typeof PROVIDERS)[number];

function ProviderCard({ provider: p, inst }: { provider: Provider; inst?: Integration }) {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const Icon = p.icon;
  const connected = inst?.status === 'connected';

  const disconnect = useMutation({
    mutationFn: () => apiClient.del(`/integrations/${p.key}`),
    onSuccess: () => {
      toast.success(t('integrations.toastDisconnected'));
      qc.invalidateQueries({ queryKey: ['integrations'] });
      qc.invalidateQueries({ queryKey: ['messenger-enabled'] });
      qc.invalidateQueries({ queryKey: ['messenger-connectable'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          <div>
            <CardTitle>{p.name}</CardTitle>
            <CardDescription>{t(p.descriptionKey)}</CardDescription>
          </div>
          {connected ? (
            <Badge variant="success" className="ml-auto">{t('integrations.statusConnected')}</Badge>
          ) : (
            <Badge variant="secondary" className="ml-auto">{t('integrations.statusDisconnected')}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {inst?.lastSyncAt && (
            <p>{t('integrations.lastSync')}: {new Date(inst.lastSyncAt).toLocaleString('pt-BR')}</p>
          )}
          {inst?.lastError && <p className="text-red-600">{t('integrations.errorLabel')}: {inst.lastError}</p>}
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={disconnect.isPending}
              onClick={() => {
                if (window.confirm(t('integrations.disconnectConfirm').replace('{name}', p.name))) {
                  disconnect.mutate();
                }
              }}
            >
              {t('integrations.disconnect')}
            </Button>
          )}
          <Button
            variant={connected ? 'outline' : 'default'}
            onClick={() => startConnect(p.connectPath)}
          >
            {connected ? t('integrations.reconnect') : t('integrations.connect')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface FbPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}
interface EnabledPage {
  id: string;
  pageId: string;
  pageName: string;
  channel: string;
  enabled: boolean;
}

function MessengerCard() {
  const { t } = useTranslate();
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const qc = useQueryClient();
  const [picking, setPicking] = useState(false);

  const { data: enabled = [] } = useQuery<EnabledPage[]>({
    queryKey: ['messenger-enabled', subAccountId],
    queryFn: () => apiClient.get('/messenger/pages/enabled'),
    enabled: !!subAccountId,
  });

  const { data: pages = [], isFetching } = useQuery<FbPage[]>({
    queryKey: ['messenger-connectable', subAccountId],
    queryFn: () => apiClient.get('/messenger/pages'),
    enabled: !!subAccountId && picking,
    retry: false,
  });

  const enable = useMutation({
    mutationFn: (p: FbPage) =>
      apiClient.post('/messenger/pages/enable', {
        pageId: p.id,
        pageName: p.name,
        pageAccessToken: p.access_token,
      }),
    onSuccess: () => {
      toast.success(t('integrations.messengerEnabled'));
      setPicking(false);
      qc.invalidateQueries({ queryKey: ['messenger-enabled', subAccountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const disable = useMutation({
    mutationFn: (pageId: string) => apiClient.del(`/messenger/pages/${pageId}`),
    onSuccess: () => {
      toast.success(t('integrations.messengerDisabled'));
      qc.invalidateQueries({ queryKey: ['messenger-enabled', subAccountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const enabledIds = new Set(enabled.filter((e) => e.enabled).map((e) => e.pageId));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <MessagesSquare className="h-5 w-5" />
          <div>
            <CardTitle>{t('integrations.messengerTitle')}</CardTitle>
            <CardDescription>{t('integrations.messengerDescription')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {enabled.filter((e) => e.enabled).length > 0 && (
          <div className="space-y-1.5">
            {enabled.filter((e) => e.enabled).map((e) => (
              <div key={e.pageId} className="flex items-center justify-between rounded-md border p-2">
                <span className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-600" /> {e.pageName}
                </span>
                <Button size="sm" variant="outline" onClick={() => disable.mutate(e.pageId)}>
                  {t('integrations.messengerDisable')}
                </Button>
              </div>
            ))}
          </div>
        )}

        {!picking ? (
          <Button size="sm" onClick={() => setPicking(true)}>{t('integrations.messengerEnablePage')}</Button>
        ) : (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{t('integrations.messengerPickPage')}</p>
            {isFetching && <p className="text-sm text-muted-foreground">{t('metaForms.loading')}</p>}
            {!isFetching && pages.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('integrations.messengerNoPages')}</p>
            )}
            {pages.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm">
                  <Facebook className="h-4 w-4 text-blue-600" /> {p.name}
                </span>
                {enabledIds.has(p.id) ? (
                  <Badge variant="success">{t('integrations.statusConnected')}</Badge>
                ) : (
                  <Button size="sm" onClick={() => enable.mutate(p)} disabled={enable.isPending}>
                    {t('integrations.messengerEnable')}
                  </Button>
                )}
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setPicking(false)}>{t('common.cancel')}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WebhookKeyResponse {
  apiKey: string;
  webhookUrl: string;
}

function FormWebhookCard() {
  const { t } = useTranslate();
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState(false);

  const { data: key } = useQuery<WebhookKeyResponse>({
    queryKey: ['webhook-key', subAccountId],
    queryFn: () => apiClient.get(`/sub-accounts/${subAccountId}/zapier-key`),
    enabled: !!subAccountId,
  });

  const rotate = useMutation({
    mutationFn: () =>
      apiClient.post<WebhookKeyResponse>(`/sub-accounts/${subAccountId}/zapier-key/rotate`, {}),
    onSuccess: () => {
      toast.success(t('integrations.keyRotated'));
      qc.invalidateQueries({ queryKey: ['webhook-key', subAccountId] });
      setRevealed(true);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} ${t('integrations.copiedSuffix')}`);
  };

  if (!key) return null;

  const maskedKey = revealed
    ? key.apiKey
    : `${key.apiKey.slice(0, 6)}${'•'.repeat(20)}${key.apiKey.slice(-4)}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Webhook className="h-5 w-5" />
          <div>
            <CardTitle className="flex items-center gap-1.5">
              {t('integrations.formWebhookTitle')}
              <HelpHint topic="leads-webhook" />
            </CardTitle>
            <CardDescription>
              {t('integrations.formWebhookDescription')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{t('integrations.webhookUrlLabel')}</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted/50 px-2 py-1.5 font-mono text-xs">
              {key.webhookUrl}
            </code>
            <Button size="sm" variant="outline" onClick={() => copy(key.webhookUrl, 'URL')}>
              {t('integrations.copy')}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {t('integrations.apiKeyLabel')}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted/50 px-2 py-1.5 font-mono text-xs">
              {maskedKey}
            </code>
            <Button size="sm" variant="outline" onClick={() => setRevealed(!revealed)}>
              {revealed ? t('integrations.hide') : t('integrations.reveal')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(key.apiKey, t('integrations.keyLabel'))}>
              {t('integrations.copy')}
            </Button>
          </div>
        </div>

        <details className="rounded-md border bg-muted/30 p-3 text-xs">
          <summary className="cursor-pointer font-medium">{t('integrations.howToConfigure')}</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
            <li>
              {t('integrations.step1Before')}{' '}
              <strong>Webhook</strong> / <em>HTTP POST</em> {t('integrations.step1After')}
            </li>
            <li>
              <strong>{t('integrations.stepUrlLabel')}</strong> {t('integrations.step2Url')} · <strong>{t('integrations.stepMethodLabel')}</strong> <code>POST</code> ·{' '}
              <strong>{t('integrations.stepPayloadLabel')}</strong> <code>json</code>
            </li>
            <li>
              <strong>{t('integrations.stepHeaderLabel')}</strong> {t('integrations.step3Before')} <code>X-CallWe-Api-Key</code> {t('integrations.step3After')}
            </li>
            <li>
              <strong>{t('integrations.stepFieldsLabel')}</strong> — <code>name</code>, <code>phone</code>, <code>email</code> {t('integrations.step4Middle')}{' '}
              <code>formName</code> / <code>campaignName</code>. {t('integrations.step4After')}
            </li>
          </ol>
        </details>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {t('integrations.rotateWarning')}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => rotate.mutate()}
            disabled={rotate.isPending}
          >
            {t('integrations.rotateKey')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
