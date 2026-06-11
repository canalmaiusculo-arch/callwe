'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HelpHint } from '@/components/help-hint';
import { useAdminViewStore } from '@/stores/admin-view-store';
import { useTranslate } from '@/i18n/provider';

interface ZapiConfig {
  configured: boolean;
  instanceId: string;
  hasToken: boolean;
  hasClientToken: boolean;
  globalFallback: boolean;
}

export default function AgencySettingsPage() {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const viewAsAgencyId = useAdminViewStore((s) => s.viewAsAgencyId);
  const qs = viewAsAgencyId ? `?agencyId=${viewAsAgencyId}` : '';

  const { data: config } = useQuery<ZapiConfig>({
    queryKey: ['zapi-config', viewAsAgencyId],
    queryFn: () => apiClient.get(`/whatsapp/config${qs}`),
  });

  const [instanceId, setInstanceId] = useState('');
  const [tokenVal, setTokenVal] = useState('');
  const [clientToken, setClientToken] = useState('');

  const save = useMutation({
    mutationFn: () =>
      apiClient.put(`/whatsapp/config${qs}`, {
        instanceId: instanceId.trim(),
        token: tokenVal.trim(),
        clientToken: clientToken.trim(),
      }),
    onSuccess: () => {
      toast.success(t('agencySettings.toastSaved'));
      setInstanceId('');
      setTokenVal('');
      setClientToken('');
      qc.invalidateQueries({ queryKey: ['zapi-config'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave = instanceId.trim() && tokenVal.trim() && clientToken.trim();

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{t('agencySettings.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('agencySettings.subtitle')}</p>
      </header>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5" />
            <div className="flex-1">
              <CardTitle className="flex items-center gap-1.5">
                WhatsApp (Z-API) <HelpHint topic="whatsapp" />
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('agencySettings.whatsappDesc')}
              </p>
            </div>
            {config?.configured ? (
              <Badge variant="success">{t('agencySettings.statusConfigured')}</Badge>
            ) : config?.globalFallback ? (
              <Badge variant="secondary">{t('agencySettings.statusDefaultNumber')}</Badge>
            ) : (
              <Badge variant="secondary">{t('agencySettings.statusNotConfigured')}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config?.configured && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                {t('agencySettings.connectedPrefix')} <code className="font-mono">{config.instanceId}</code>
                {t('agencySettings.connectedSuffix')}
              </span>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {t('agencySettings.credentialsHintPrefix')}{' '}
            <a href="https://z-api.io" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Z-API
            </a>{' '}
            {t('agencySettings.credentialsHintSuffix')}
          </p>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('agencySettings.labelInstanceId')}</label>
            <Input value={instanceId} onChange={(e) => setInstanceId(e.target.value)} placeholder={t('agencySettings.placeholderInstanceId')} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('agencySettings.labelToken')}</label>
            <Input type="password" value={tokenVal} onChange={(e) => setTokenVal(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('agencySettings.labelClientToken')}</label>
            <Input type="password" value={clientToken} onChange={(e) => setClientToken(e.target.value)} placeholder="••••••••" />
          </div>

          <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
            {save.isPending ? t('agencySettings.saving') : t('agencySettings.saveCredentials')}
          </Button>

          <p className="text-xs text-muted-foreground">
            {t('agencySettings.footerHint')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
