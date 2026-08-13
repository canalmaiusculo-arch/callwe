'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessagesSquare, Check, Facebook } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenantStore } from '@/stores/tenant-store';
import { useTranslate } from '@/i18n/provider';

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

/**
 * Card de habilitar Messenger para uma sub-account. Usado no workspace (tenant
 * atual) e no detalhe de cliente da agência (via prop `subAccountId`).
 */
export function MessengerEnableCard({
  subAccountId: override,
  className,
}: {
  subAccountId?: string;
  className?: string;
}) {
  const { t } = useTranslate();
  const tenantSub = useTenantStore((s) => s.subAccountId);
  const subAccountId = override ?? tenantSub;
  const qc = useQueryClient();
  const [picking, setPicking] = useState(false);
  const opts = override ? { subAccountId: override } : undefined;

  const { data: enabled = [] } = useQuery<EnabledPage[]>({
    queryKey: ['messenger-enabled', subAccountId],
    queryFn: () => apiClient.get('/messenger/pages/enabled', opts),
    enabled: !!subAccountId,
  });

  const {
    data: pages = [],
    isFetching,
    isError: pagesError,
  } = useQuery<FbPage[]>({
    queryKey: ['messenger-connectable', subAccountId],
    queryFn: () => apiClient.get('/messenger/pages', opts),
    enabled: !!subAccountId && picking,
    retry: false,
  });

  const enable = useMutation({
    mutationFn: (p: FbPage) =>
      apiClient.post(
        '/messenger/pages/enable',
        { pageId: p.id, pageName: p.name, pageAccessToken: p.access_token },
        opts,
      ),
    onSuccess: () => {
      toast.success(t('integrations.messengerEnabled'));
      setPicking(false);
      qc.invalidateQueries({ queryKey: ['messenger-enabled', subAccountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const disable = useMutation({
    mutationFn: (pageId: string) => apiClient.del(`/messenger/pages/${pageId}`, opts),
    onSuccess: () => {
      toast.success(t('integrations.messengerDisabled'));
      qc.invalidateQueries({ queryKey: ['messenger-enabled', subAccountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function connectMeta() {
    try {
      const res = await apiClient.get<{ authorizeUrl: string }>('/integrations/meta-ads/connect', opts);
      if (res.authorizeUrl) window.location.href = res.authorizeUrl;
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const enabledIds = new Set(enabled.filter((e) => e.enabled).map((e) => e.pageId));
  const active = enabled.filter((e) => e.enabled);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <MessagesSquare className="h-5 w-5" />
          <div>
            <CardTitle className="text-base">{t('integrations.messengerTitle')}</CardTitle>
            <CardDescription>{t('integrations.messengerDescription')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {active.length > 0 && (
          <div className="space-y-1.5">
            {active.map((e) => (
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
          <Button size="sm" onClick={() => setPicking(true)}>
            {t('integrations.messengerEnablePage')}
          </Button>
        ) : (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{t('integrations.messengerPickPage')}</p>
            {isFetching && <p className="text-sm text-muted-foreground">{t('metaForms.loading')}</p>}
            {!isFetching && pagesError && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t('integrations.messengerConnectMeta')}</p>
                <Button size="sm" onClick={connectMeta}>
                  {t('integrations.connect')}
                </Button>
              </div>
            )}
            {!isFetching && !pagesError && pages.length === 0 && (
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
            <Button size="sm" variant="ghost" onClick={() => setPicking(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
