'use client';

import { useQuery } from '@tanstack/react-query';
import { Facebook, Phone, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
      </div>
    </div>
  );
}
