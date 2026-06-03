'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Plus, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenantStore } from '@/stores/tenant-store';

interface ClientDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  cloudtalkTag: string;
  settings: Record<string, unknown> | null;
  phoneNumbers: Array<{ id: string; e164: string; label: string | null; cloudtalkNumberId: string }>;
  _count: { leads: number; interactions: number };
}

interface WhatsappGroup {
  phone: string;
  name: string;
}

interface AvailableNumber {
  cloudtalkNumberId: string;
  e164: string;
  label: string | null;
  country: string | null;
  assignedTo: string | null;
}

export default function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const qc = useQueryClient();
  const router = useRouter();
  const setTenant = useTenantStore((s) => s.setTenant);
  const [showAdd, setShowAdd] = useState(false);

  const { data: client } = useQuery<ClientDetail>({
    queryKey: ['client', clientId],
    queryFn: () => apiClient.get(`/sub-accounts/${clientId}`),
  });

  const { data: available = [] } = useQuery<AvailableNumber[]>({
    queryKey: ['available-numbers'],
    queryFn: () => apiClient.get('/phone-numbers/available'),
    enabled: showAdd,
  });

  const attach = useMutation({
    mutationFn: (n: AvailableNumber) =>
      apiClient.post('/phone-numbers', {
        subAccountId: clientId,
        cloudtalkNumberId: n.cloudtalkNumberId,
        e164: n.e164,
        label: n.label,
        country: n.country,
      }),
    onSuccess: () => {
      toast.success('Número associado');
      qc.invalidateQueries({ queryKey: ['client', clientId] });
      qc.invalidateQueries({ queryKey: ['available-numbers'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const release = useMutation({
    mutationFn: (id: string) => apiClient.del(`/phone-numbers/${id}`),
    onSuccess: () => {
      toast.success('Número liberado');
      qc.invalidateQueries({ queryKey: ['client', clientId] });
    },
  });

  if (!client) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const free = available.filter((n) => !n.assignedTo);
  const taken = available.filter((n) => n.assignedTo);

  return (
    <div className="p-8">
      <Link href={'/agency/clients' as never} className="text-sm text-muted-foreground hover:underline">
        ← Clientes
      </Link>
      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <div className="mt-2 flex gap-2 text-sm">
            <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>{client.status}</Badge>
            <Badge variant="outline">{client.plan}</Badge>
          </div>
        </div>
        <Button
          onClick={() => {
            setTenant(clientId, client.name);
            router.push('/workspace');
          }}
        >
          <ExternalLink className="h-4 w-4" /> Abrir workspace
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client._count.leads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Interações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client._count.interactions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Números</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client.phoneNumbers.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Números atribuídos</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4" /> Adicionar número
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {client.phoneNumbers.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum número atribuído ainda.</p>
          )}
          {client.phoneNumbers.map((n) => (
            <div key={n.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-mono text-sm">{n.e164}</p>
                  {n.label && <p className="text-xs text-muted-foreground">{n.label}</p>}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => release.mutate(n.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {showAdd && (
        <>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">
                Números disponíveis no CloudTalk ({free.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {free.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Todos os números já estão associados — veja abaixo.
                </p>
              )}
              {free.map((n) => (
                <div key={n.cloudtalkNumberId} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-mono text-sm">{n.e164}</p>
                    {n.label && <p className="text-xs text-muted-foreground">{n.label}</p>}
                  </div>
                  <Button size="sm" onClick={() => attach.mutate(n)} disabled={attach.isPending}>
                    Atribuir
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {taken.length > 0 && (
            <Card className="mt-4 opacity-70">
              <CardHeader>
                <CardTitle className="text-base">Números já em uso ({taken.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {taken.map((n) => (
                  <div key={n.cloudtalkNumberId} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-mono text-sm">{n.e164}</p>
                      {n.label && <p className="text-xs text-muted-foreground">{n.label}</p>}
                    </div>
                    <Badge variant="secondary">{n.assignedTo}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <WhatsappGroupCard clientId={clientId} currentGroupId={(client.settings?.whatsappGroupId as string | undefined) ?? null} />

      <ZapierWebhookCard clientId={clientId} />
    </div>
  );
}

function WhatsappGroupCard({
  clientId,
  currentGroupId,
}: {
  clientId: string;
  currentGroupId: string | null;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: groups = [], isLoading, error } = useQuery<WhatsappGroup[]>({
    queryKey: ['whatsapp-groups'],
    queryFn: () => apiClient.get('/whatsapp/groups'),
    enabled: expanded,
    retry: false,
  });

  const save = useMutation({
    mutationFn: (groupId: string | null) =>
      apiClient.patch(`/sub-accounts/${clientId}/whatsapp`, { whatsappGroupId: groupId }),
    onSuccess: () => {
      toast.success(currentGroupId ? 'Grupo atualizado' : 'Grupo conectado');
      qc.invalidateQueries({ queryKey: ['client', clientId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const currentGroup = groups.find((g) => g.phone === currentGroupId);

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">WhatsApp do cliente</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Grupo onde resumos das chamadas serão enviados.
          </p>
        </div>
        {currentGroupId && (
          <Badge variant="secondary" className="font-mono text-xs">
            {currentGroup?.name ?? currentGroupId}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {!expanded ? (
          <Button size="sm" variant="outline" onClick={() => setExpanded(true)}>
            {currentGroupId ? 'Trocar grupo' : 'Configurar grupo'}
          </Button>
        ) : (
          <div className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando grupos do Z-API...</p>}
            {error && (
              <p className="text-sm text-red-600">
                {(error as Error).message ?? 'Erro carregando grupos'}
              </p>
            )}
            {!isLoading && !error && groups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum grupo encontrado. Adicione o número da Z-API a um grupo WhatsApp primeiro.
              </p>
            )}
            {groups.length > 0 && (
              <select
                value={currentGroupId ?? ''}
                onChange={(e) => save.mutate(e.target.value || null)}
                disabled={save.isPending}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">— desconectar —</option>
                {groups.map((g) => (
                  <option key={g.phone} value={g.phone}>
                    {g.name} ({g.phone})
                  </option>
                ))}
              </select>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
              Fechar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ZapierKeyResponse {
  apiKey: string;
  webhookUrl: string;
}

function ZapierWebhookCard({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState(false);

  const { data: key } = useQuery<ZapierKeyResponse>({
    queryKey: ['zapier-key', clientId],
    queryFn: () => apiClient.get(`/sub-accounts/${clientId}/zapier-key`),
  });

  const rotate = useMutation({
    mutationFn: () => apiClient.post<ZapierKeyResponse>(`/sub-accounts/${clientId}/zapier-key/rotate`, {}),
    onSuccess: () => {
      toast.success('Chave rotacionada — atualize seu Zap');
      qc.invalidateQueries({ queryKey: ['zapier-key', clientId] });
      setRevealed(true);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  if (!key) return null;

  const maskedKey = revealed ? key.apiKey : `${key.apiKey.slice(0, 6)}${'•'.repeat(20)}${key.apiKey.slice(-4)}`;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Receber leads via Zapier</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Use enquanto o app Meta está em review — Zapier dispara leads do Facebook (ou outras fontes) direto pro CallWe.
        </p>
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
          <p className="text-xs font-medium uppercase text-muted-foreground">API Key (header X-CallWe-Api-Key)</p>
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
          <summary className="cursor-pointer font-medium">Como configurar no Zapier</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
            <li><strong>Trigger:</strong> Facebook Lead Ads → New Lead</li>
            <li>Conecta a conta Facebook e seleciona Page + Form</li>
            <li><strong>Action:</strong> Webhooks by Zapier → <em>POST</em></li>
            <li><strong>URL:</strong> cola a URL acima</li>
            <li><strong>Payload Type:</strong> <code>json</code></li>
            <li><strong>Data</strong>: mapeia campos do form do Facebook pra essas chaves do CallWe:
              <ul className="mt-1 list-disc pl-5">
                <li><code>name</code> → nome do lead</li>
                <li><code>phone</code> → telefone (qualquer formato — normalizamos)</li>
                <li><code>email</code> → e-mail</li>
                <li><code>formName</code> (opcional) → nome do form pra agrupar</li>
                <li><code>campaignName</code> (opcional) → nome da campanha</li>
              </ul>
            </li>
            <li><strong>Headers:</strong> adiciona <code>X-CallWe-Api-Key</code> com o valor da chave acima</li>
            <li>Testa o Zap → confirma que aparece em /workspace/leads com origem &quot;Meta&quot;</li>
          </ol>
        </details>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            ⚠️ Rotacionar a chave invalida a anterior — você precisa atualizar o Zap.
          </p>
          <Button size="sm" variant="outline" onClick={() => rotate.mutate()} disabled={rotate.isPending}>
            Rotacionar chave
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
