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

interface ZapiConfig {
  configured: boolean;
  instanceId: string;
  hasToken: boolean;
  hasClientToken: boolean;
  globalFallback: boolean;
}

export default function AgencySettingsPage() {
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
      toast.success('Z-API configurada');
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
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="mt-1 text-muted-foreground">Integrações e preferências da agência.</p>
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
                Use o número de WhatsApp da sua agência para enviar os resumos aos clientes.
              </p>
            </div>
            {config?.configured ? (
              <Badge variant="success">Configurado</Badge>
            ) : config?.globalFallback ? (
              <Badge variant="secondary">Usando número padrão</Badge>
            ) : (
              <Badge variant="secondary">Não configurado</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config?.configured && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                Conectado — Instance ID atual: <code className="font-mono">{config.instanceId}</code>. Preencha
                de novo abaixo para trocar.
              </span>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Pegue esses dados no painel da{' '}
            <a href="https://z-api.io" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Z-API
            </a>{' '}
            (sua instância conectada ao WhatsApp da agência).
          </p>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Instance ID</label>
            <Input value={instanceId} onChange={(e) => setInstanceId(e.target.value)} placeholder="ex.: 3D1A2B..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Token (da instância)</label>
            <Input type="password" value={tokenVal} onChange={(e) => setTokenVal(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Client-Token (segurança da conta)</label>
            <Input type="password" value={clientToken} onChange={(e) => setClientToken(e.target.value)} placeholder="••••••••" />
          </div>

          <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
            {save.isPending ? 'Salvando...' : 'Salvar credenciais'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Depois de configurar, escolha o grupo de WhatsApp de cada cliente no detalhe do cliente.
            Recomendado cada agência usar o próprio número (evita bloqueio do WhatsApp).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
