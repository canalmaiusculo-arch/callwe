'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  MessageSquare,
  LogOut,
  LayoutDashboard,
  Gauge,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SoftphoneFrame } from '@/components/agent/softphone-frame';
import { InteractionDrawer } from '@/components/interaction-drawer';
import { useAuthStore } from '@/stores/auth-store';
import { useRealtimeCalls } from '@/hooks/use-realtime-calls';

interface AssignedClient {
  id: string;
  name: string;
}

interface Interaction {
  id: string;
  type: 'call' | 'sms' | 'voicemail' | 'meta_form';
  direction: 'inbound' | 'outbound';
  status: string;
  startedAt: string;
  durationSeconds: number | null;
  fromNumber: string | null;
  toNumber: string | null;
  smsBody: string | null;
  recordingUrl: string | null;
  aiSummary: string | null;
  lead: { id: string; name: string | null } | null;
  agent: { id: string; fullName: string } | null;
  subAccount: { id: string; name: string } | null;
}

interface AgentStats {
  callsToday: number;
  callsWeek: number;
  totalTalkTimeToday: number;
  avgTalkTime: number;
  smsToday: number;
}

type Tab = 'dashboard' | 'calls' | 'sms';

export default function AgentPage() {
  const incoming = useRealtimeCalls();
  const [activeCall, setActiveCall] = useState<unknown>(null);
  const [tab, setTab] = useState<Tab>('calls');
  const [onlyMine, setOnlyMine] = useState(true);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const clearAuth = useAuthStore((s) => s.clear);

  const { data: clients = [] } = useQuery<AssignedClient[]>({
    queryKey: ['my-clients'],
    queryFn: () => apiClient.get('/sub-accounts/mine'),
  });

  useEffect(() => {
    if (incoming) setActiveCall(incoming);
  }, [incoming]);

  return (
    <div className="grid h-screen grid-cols-12 gap-3 bg-muted/20 p-3">
      <aside className="col-span-2 flex flex-col rounded-lg border bg-background p-3">
        <div className="mb-3">
          <p className="text-xs uppercase text-muted-foreground">Atendente</p>
          <p className="text-sm font-semibold">Painel ao vivo</p>
        </div>

        <nav className="mb-3 space-y-1">
          <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={Gauge} label="Dashboard" />
          <TabButton active={tab === 'calls'} onClick={() => setTab('calls')} icon={Phone} label="Chamadas" />
          <TabButton active={tab === 'sms'} onClick={() => setTab('sms')} icon={MessageSquare} label="SMS" />
        </nav>

        <div className="mt-2 flex-1 overflow-auto border-t pt-3">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            Meus clientes ({clients.length})
          </p>
          <div className="space-y-0.5">
            {clients.map((c) => (
              <div key={c.id} className="rounded px-2 py-1 text-xs text-muted-foreground">
                {c.name}
              </div>
            ))}
          </div>
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

      <section className="col-span-7 overflow-auto">
        {activeCall ? (
          <ActiveCallView call={activeCall} onDismiss={() => setActiveCall(null)} />
        ) : tab === 'dashboard' ? (
          <DashboardView />
        ) : tab === 'calls' ? (
          <CallsView onlyMine={onlyMine} onToggleMine={() => setOnlyMine(!onlyMine)} onOpen={setDrawerId} />
        ) : (
          <SmsView onlyMine={onlyMine} onToggleMine={() => setOnlyMine(!onlyMine)} onOpen={setDrawerId} />
        )}
      </section>

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

      <InteractionDrawer interactionId={drawerId} onClose={() => setDrawerId(null)} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function DashboardView() {
  const { data: stats } = useQuery<AgentStats>({
    queryKey: ['agent-stats'],
    queryFn: () => apiClient.get<AgentStats>('/interactions/mine/stats'),
    refetchInterval: 30_000,
  });

  const s = stats ?? { callsToday: 0, callsWeek: 0, totalTalkTimeToday: 0, avgTalkTime: 0, smsToday: 0 };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Meu desempenho</h1>
        <p className="text-sm text-muted-foreground">Atualiza a cada 30s</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Chamadas hoje" value={s.callsToday} icon={Phone} />
        <StatCard title="Chamadas (7d)" value={s.callsWeek} icon={LayoutDashboard} />
        <StatCard title="SMS hoje" value={s.smsToday} icon={MessageSquare} />
        <StatCard title="Tempo ao telefone hoje" value={formatDuration(s.totalTalkTimeToday)} icon={Clock} />
        <StatCard title="TMA (tempo médio)" value={formatDuration(s.avgTalkTime)} icon={Clock} />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function CallsView({
  onlyMine,
  onToggleMine,
  onOpen,
}: {
  onlyMine: boolean;
  onToggleMine: () => void;
  onOpen: (id: string) => void;
}) {
  const { data: calls = [] } = useQuery<Interaction[]>({
    queryKey: ['my-calls', onlyMine],
    queryFn: () => apiClient.get(`/interactions/mine?type=call&onlyMine=${onlyMine}`),
    refetchInterval: 15_000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Chamadas {onlyMine ? '(minhas)' : '(todos clientes)'}</CardTitle>
        <Button size="sm" variant="outline" onClick={onToggleMine}>
          {onlyMine ? 'Ver todas' : 'Só minhas'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {calls.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
            <Phone className="mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma chamada.</p>
          </div>
        )}
        {calls.map((c) => (
          <CallRow key={c.id} call={c} onClick={() => onOpen(c.id)} />
        ))}
      </CardContent>
    </Card>
  );
}

function CallRow({ call, onClick }: { call: Interaction; onClick: () => void }) {
  const Icon = call.status === 'missed' ? PhoneMissed : call.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
  const iconColor =
    call.status === 'missed'
      ? 'text-red-600'
      : call.direction === 'inbound'
        ? 'text-emerald-600'
        : 'text-blue-600';

  return (
    <button
      onClick={onClick}
      className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/40"
    >
      <Icon className={`h-5 w-5 ${iconColor}`} />
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">De</p>
          <p className="font-mono">{call.fromNumber ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cliente</p>
          <p>{call.subAccount?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Lead</p>
          <p>{call.lead?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Quando</p>
          <p>{new Date(call.startedAt).toLocaleString('pt-BR')}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {call.durationSeconds && (
          <Badge variant="secondary" className="text-xs">{formatDuration(call.durationSeconds)}</Badge>
        )}
        <Badge variant={call.status === 'missed' ? 'destructive' : 'secondary'}>{call.status}</Badge>
      </div>
    </button>
  );
}

function SmsView({
  onlyMine,
  onToggleMine,
  onOpen,
}: {
  onlyMine: boolean;
  onToggleMine: () => void;
  onOpen: (id: string) => void;
}) {
  const { data: messages = [] } = useQuery<Interaction[]>({
    queryKey: ['my-sms', onlyMine],
    queryFn: () => apiClient.get(`/interactions/mine?type=sms&onlyMine=${onlyMine}`),
    refetchInterval: 15_000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>SMS {onlyMine ? '(meus)' : '(todos clientes)'}</CardTitle>
        <Button size="sm" variant="outline" onClick={onToggleMine}>
          {onlyMine ? 'Ver todas' : 'Só minhas'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma mensagem.</p>
        )}
        {messages.map((m) => (
          <button
            key={m.id}
            onClick={() => onOpen(m.id)}
            className="flex w-full gap-3 rounded-md border p-3 text-left hover:bg-muted/40"
          >
            <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {m.direction === 'inbound' ? 'De' : 'Para'}:{' '}
                  <span className="font-mono">
                    {m.direction === 'inbound' ? m.fromNumber : m.toNumber}
                  </span>
                  {' · '}
                  {m.subAccount?.name}
                </span>
                <span>{new Date(m.startedAt).toLocaleString('pt-BR')}</span>
              </div>
              <p className="mt-1 text-sm">{m.smsBody}</p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function ActiveCallView({ call, onDismiss }: { call: unknown; onDismiss: () => void }) {
  const c = call as {
    from_number?: string;
    external_number?: string;
    subAccountId?: string;
    subAccountName?: string;
  };

  const { data: briefing } = useQuery<{ businessSummary?: string; scripts?: { opening?: string } } | null>({
    queryKey: ['briefing', c.subAccountId],
    queryFn: () => apiClient.get(`/briefings/by-sub-account/${c.subAccountId}`),
    enabled: !!c.subAccountId,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-100 p-3">
            <PhoneIncoming className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase text-muted-foreground">
              Chamada entrante {c.subAccountName && `· ${c.subAccountName}`}
            </p>
            <CardTitle className="text-2xl">{c.external_number ?? c.from_number ?? '—'}</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={onDismiss}>Fechar</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {briefing?.businessSummary && (
          <Card className="bg-muted/30">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Sobre o cliente</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{briefing.businessSummary}</p></CardContent>
          </Card>
        )}
        {briefing?.scripts?.opening && (
          <Card className="bg-blue-50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Script de abertura</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{briefing.scripts.opening}</p></CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
