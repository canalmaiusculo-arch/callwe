'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, PhoneIncoming, Clock, User, LogOut } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SoftphoneFrame } from '@/components/agent/softphone-frame';
import { useAuthStore } from '@/stores/auth-store';
import { useRealtimeCalls } from '@/hooks/use-realtime-calls';

interface AssignedClient {
  id: string;
  name: string;
  slug: string;
}

interface RecentCall {
  id: string;
  type: string;
  direction: string;
  status: string;
  startedAt: string;
  fromNumber: string | null;
  toNumber: string | null;
  durationSeconds: number | null;
  lead: { id: string; name: string | null } | null;
}

export default function AgentPage() {
  const incoming = useRealtimeCalls();
  const [activeCall, setActiveCall] = useState<unknown>(null);
  const clearAuth = useAuthStore((s) => s.clear);

  // Busca clientes designados ao atendente
  const { data: clients = [] } = useQuery<AssignedClient[]>({
    queryKey: ['my-clients'],
    queryFn: () => apiClient.get('/sub-accounts/mine'),
  });

  useEffect(() => {
    if (incoming) setActiveCall(incoming);
  }, [incoming]);

  return (
    <div className="grid h-screen grid-cols-12 gap-3 bg-muted/20 p-3">
      {/* Sidebar — clientes designados */}
      <aside className="col-span-2 flex flex-col rounded-lg border bg-background p-3">
        <div className="mb-3">
          <p className="text-xs uppercase text-muted-foreground">Atendente</p>
          <p className="text-sm font-semibold">Painel ao vivo</p>
        </div>
        <div className="flex-1 space-y-1 overflow-auto">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            Meus clientes ({clients.length})
          </p>
          {clients.map((c) => (
            <div key={c.id} className="rounded px-2 py-1.5 text-sm hover:bg-muted/40">
              {c.name}
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            clearAuth();
            window.location.href = '/login';
          }}
          className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>

      {/* Chamada ativa + briefing */}
      <section className="col-span-7">
        <ActiveCallView call={activeCall} />
      </section>

      {/* Softphone embed */}
      <aside className="col-span-3">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-sm">Softphone</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-2">
            <SoftphoneFrame />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function ActiveCallView({ call }: { call: unknown }) {
  if (!call) {
    return <RecentCallsView />;
  }

  const c = call as {
    from_number?: string;
    external_number?: string;
    internal_number?: string;
    direction?: string;
  };
  const externalNumber = c.external_number ?? c.from_number ?? '—';

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-100 p-3">
            <PhoneIncoming className="h-6 w-6 text-emerald-700" />
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Chamada entrante</p>
            <CardTitle className="text-2xl">{externalNumber}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Briefing do cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Briefing aparecerá aqui quando configurado para esse cliente.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Histórico do lead</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sem histórico anterior — primeiro contato.
            </p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function RecentCallsView() {
  const { data: calls = [] } = useQuery<RecentCall[]>({
    queryKey: ['recent-calls'],
    queryFn: () => apiClient.get('/interactions?type=call'),
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Chamadas recentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {calls.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Phone className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">Aguardando chamadas...</p>
          </div>
        )}
        {calls.slice(0, 10).map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-3">
              <Phone className={`h-4 w-4 ${c.direction === 'inbound' ? 'text-emerald-600' : 'text-blue-600'}`} />
              <div>
                <p className="text-sm font-mono">{c.direction === 'inbound' ? c.fromNumber : c.toNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {c.lead?.name ?? 'Sem nome'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {c.durationSeconds && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.floor(c.durationSeconds / 60)}:{(c.durationSeconds % 60).toString().padStart(2, '0')}
                </span>
              )}
              <Badge variant={c.status === 'missed' ? 'destructive' : 'secondary'}>
                {c.status}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
