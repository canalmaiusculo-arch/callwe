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
  phoneNumbers: Array<{ id: string; e164: string; label: string | null; cloudtalkNumberId: string }>;
  _count: { leads: number; interactions: number };
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
    </div>
  );
}
