'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Facebook, Phone, MessageCircle, Webhook } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenantStore } from '@/stores/tenant-store';
import { HelpHint } from '@/components/help-hint';

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
    description: 'Recebe leads dos formulários nativos do Facebook/Instagram direto no CRM.',
    icon: Facebook,
    connectPath: '/integrations/meta-ads/connect',
  },
  {
    key: 'whatsapp_cloud' as const,
    name: 'WhatsApp Business',
    description: 'Mensagens do WhatsApp no mesmo painel.',
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
  const { data: integrations = [] } = useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: () => apiClient.get<Integration[]>('/integrations'),
  });

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Integrações</h1>
        <p className="mt-1 text-muted-foreground">Conecte serviços externos a esta subconta.</p>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5" />
              <div>
                <CardTitle>CloudTalk</CardTitle>
                <CardDescription>Telefonia (obrigatório — configurado pela agência)</CardDescription>
              </div>
              <Badge variant="success" className="ml-auto">Ativo</Badge>
            </div>
          </CardHeader>
        </Card>

        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          const inst = integrations.find((i) => i.provider === p.key);
          const connected = inst?.status === 'connected';
          return (
            <Card key={p.key}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <div>
                    <CardTitle>{p.name}</CardTitle>
                    <CardDescription>{p.description}</CardDescription>
                  </div>
                  {connected ? (
                    <Badge variant="success" className="ml-auto">Conectado</Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-auto">Desconectado</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {inst?.lastSyncAt && (
                    <p>Última sync: {new Date(inst.lastSyncAt).toLocaleString('pt-BR')}</p>
                  )}
                  {inst?.lastError && <p className="text-red-600">Erro: {inst.lastError}</p>}
                </div>
                <Button
                  variant={connected ? 'outline' : 'default'}
                  onClick={() => startConnect(p.connectPath)}
                >
                  {connected ? 'Reconectar' : 'Conectar'}
                </Button>
              </CardContent>
            </Card>
          );
        })}

        <FormWebhookCard />
      </div>
    </div>
  );
}

interface WebhookKeyResponse {
  apiKey: string;
  webhookUrl: string;
}

function FormWebhookCard() {
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
      toast.success('Chave rotacionada — atualize a integração');
      qc.invalidateQueries({ queryKey: ['webhook-key', subAccountId] });
      setRevealed(true);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
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
              Formulário / Quizz (webhook)
              <HelpHint topic="leads-webhook" />
            </CardTitle>
            <CardDescription>
              Cole esta URL no webhook do seu formulário, quizz ou landing page — os leads caem
              direto no CRM com origem &quot;Formulário&quot;.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">URL do webhook</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted/50 px-2 py-1.5 font-mono text-xs">
              {key.webhookUrl}
            </code>
            <Button size="sm" variant="outline" onClick={() => copy(key.webhookUrl, 'URL')}>
              Copiar
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            API Key (header X-CallWe-Api-Key)
          </p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted/50 px-2 py-1.5 font-mono text-xs">
              {maskedKey}
            </code>
            <Button size="sm" variant="outline" onClick={() => setRevealed(!revealed)}>
              {revealed ? 'Ocultar' : 'Revelar'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(key.apiKey, 'Chave')}>
              Copiar
            </Button>
          </div>
        </div>

        <details className="rounded-md border bg-muted/30 p-3 text-xs">
          <summary className="cursor-pointer font-medium">Como configurar</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
            <li>
              Na sua ferramenta (Typeform, Jotform, quizz, etc.), procure a opção de{' '}
              <strong>Webhook</strong> / <em>HTTP POST</em> ao finalizar o envio.
            </li>
            <li>
              <strong>URL:</strong> cola a URL acima · <strong>Método:</strong> <code>POST</code> ·{' '}
              <strong>Payload:</strong> <code>json</code>
            </li>
            <li>
              <strong>Header:</strong> adiciona <code>X-CallWe-Api-Key</code> com o valor da chave
              acima
            </li>
            <li>
              <strong>Campos</strong> — <code>name</code>, <code>phone</code>, <code>email</code> e,
              opcionalmente, <code>formName</code> / <code>campaignName</code>. Qualquer campo extra é
              guardado automaticamente.
            </li>
          </ol>
        </details>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            ⚠️ Rotacionar a chave invalida a anterior — você precisa atualizar a integração.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => rotate.mutate()}
            disabled={rotate.isPending}
          >
            Rotacionar chave
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
