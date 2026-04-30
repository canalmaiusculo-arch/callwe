'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Search,
  Send,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SoftphoneFrame } from '@/components/agent/softphone-frame';
import { InteractionDrawer } from '@/components/interaction-drawer';
import { NotificationBanner } from '@/components/agent/notification-banner';
import { useAuthStore } from '@/stores/auth-store';
import { useRealtimeCalls, useRealtimeSms } from '@/hooks/use-realtime-calls';

interface AssignedClient {
  id: string;
  name: string;
  cloudtalkTag: string;
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
  const [tab, setTab] = useState<Tab>('calls');
  const [onlyMine, setOnlyMine] = useState(true);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [smsBadge, setSmsBadge] = useState(0);
  const [filterSubAccountId, setFilterSubAccountId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const clearAuth = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery<AssignedClient[]>({
    queryKey: ['my-clients'],
    queryFn: () => apiClient.get('/sub-accounts/mine'),
  });

  const subTags = clients.map((c) => c.cloudtalkTag);
  const { activeCall, dismiss: dismissActiveCall } = useRealtimeCalls(subTags);

  useRealtimeSms(subTags, () => {
    queryClient.invalidateQueries({ queryKey: ['my-sms'] });
    if (tab !== 'sms') setSmsBadge((n) => n + 1);
  });

  useEffect(() => {
    if (tab === 'sms') setSmsBadge(0);
  }, [tab]);

  // Limpa busca ao trocar de tab
  useEffect(() => setSearch(''), [tab]);

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
          <TabButton active={tab === 'sms'} onClick={() => setTab('sms')} icon={MessageSquare} label="SMS" badge={smsBadge} />
        </nav>

        <div className="mt-2 flex min-h-0 flex-1 flex-col border-t pt-3">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            Meus clientes ({clients.length})
          </p>
          <div className="flex-1 space-y-0.5 overflow-auto">
            <button
              onClick={() => setFilterSubAccountId(null)}
              className={`w-full rounded px-2 py-1 text-left text-xs ${
                filterSubAccountId === null ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Todos os clientes
            </button>
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilterSubAccountId(c.id)}
                className={`w-full rounded px-2 py-1 text-left text-xs ${
                  filterSubAccountId === c.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {c.name}
              </button>
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

      <section className="col-span-7 min-h-0 space-y-3 overflow-auto">
        <NotificationBanner />
        {activeCall && (
          <div className="sticky top-0 z-20 -mx-3 -mt-3 mb-3 border-b bg-muted/40 px-3 pb-3 pt-3 backdrop-blur">
            <ActiveCallView call={activeCall} onDismiss={dismissActiveCall} />
          </div>
        )}
        {tab !== 'dashboard' && (
          <SearchBar value={search} onChange={setSearch} placeholder={tab === 'calls' ? 'Buscar chamada (número, cliente, lead)...' : 'Buscar SMS (número, cliente, conteúdo)...'} />
        )}
        {tab === 'dashboard' ? (
          <DashboardView />
        ) : tab === 'calls' ? (
          <CallsView
            onlyMine={onlyMine}
            onToggleMine={() => setOnlyMine(!onlyMine)}
            onOpen={setDrawerId}
            filterSubAccountId={filterSubAccountId}
            search={search}
          />
        ) : (
          <SmsView
            onlyMine={onlyMine}
            onToggleMine={() => setOnlyMine(!onlyMine)}
            onOpen={setDrawerId}
            filterSubAccountId={filterSubAccountId}
            search={search}
          />
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
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{label}</span>
      {badge && badge > 0 ? (
        <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-xs font-semibold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
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
  filterSubAccountId,
  search,
}: {
  onlyMine: boolean;
  onToggleMine: () => void;
  onOpen: (id: string) => void;
  filterSubAccountId: string | null;
  search: string;
}) {
  const { data: calls = [] } = useQuery<Interaction[]>({
    queryKey: ['my-calls', onlyMine],
    queryFn: () => apiClient.get(`/interactions/mine?type=call&onlyMine=${onlyMine}`),
    refetchInterval: 15_000,
  });

  const filtered = useMemo(
    () => filterInteractions(calls, { filterSubAccountId, search }),
    [calls, filterSubAccountId, search],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Chamadas {onlyMine ? '(minhas)' : '(todos clientes)'}
          {(filterSubAccountId || search) && (
            <span className="ml-2 text-xs text-muted-foreground">{filtered.length}/{calls.length}</span>
          )}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={onToggleMine}>
          {onlyMine ? 'Ver todas' : 'Só minhas'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
            <Phone className="mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">{calls.length === 0 ? 'Nenhuma chamada.' : 'Nenhuma chamada bate com o filtro.'}</p>
          </div>
        )}
        {filtered.map((c) => (
          <CallRow key={c.id} call={c} onClick={() => onOpen(c.id)} />
        ))}
      </CardContent>
    </Card>
  );
}

function filterInteractions(
  list: Interaction[],
  { filterSubAccountId, search }: { filterSubAccountId: string | null; search: string },
): Interaction[] {
  let out = list;
  if (filterSubAccountId) out = out.filter((i) => i.subAccount?.id === filterSubAccountId);
  const q = search.trim().toLowerCase();
  if (q) {
    out = out.filter((i) => {
      const haystack = [
        i.fromNumber,
        i.toNumber,
        i.subAccount?.name,
        i.lead?.name,
        i.smsBody,
        i.agent?.fullName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }
  return out;
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border bg-background py-2 pl-9 pr-9 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
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
  filterSubAccountId,
  search,
}: {
  onlyMine: boolean;
  onToggleMine: () => void;
  onOpen: (id: string) => void;
  filterSubAccountId: string | null;
  search: string;
}) {
  const { data: messages = [] } = useQuery<Interaction[]>({
    queryKey: ['my-sms', onlyMine],
    queryFn: () => apiClient.get(`/interactions/mine?type=sms&onlyMine=${onlyMine}`),
    refetchInterval: 15_000,
  });

  const filtered = useMemo(
    () => filterInteractions(messages, { filterSubAccountId, search }),
    [messages, filterSubAccountId, search],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          SMS {onlyMine ? '(meus)' : '(todos clientes)'}
          {(filterSubAccountId || search) && (
            <span className="ml-2 text-xs text-muted-foreground">{filtered.length}/{messages.length}</span>
          )}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={onToggleMine}>
          {onlyMine ? 'Ver todas' : 'Só minhas'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {messages.length === 0 ? 'Nenhuma mensagem.' : 'Nenhuma mensagem bate com o filtro.'}
          </p>
        )}
        {filtered.map((m) => (
          <SmsRow key={m.id} sms={m} onOpen={() => onOpen(m.id)} />
        ))}
      </CardContent>
    </Card>
  );
}

function SmsRow({ sms, onOpen }: { sms: Interaction; onOpen: () => void }) {
  const [showReply, setShowReply] = useState(false);
  const [text, setText] = useState('');
  const queryClient = useQueryClient();

  const subAccountId = sms.subAccount?.id;
  const replyTo = sms.direction === 'inbound' ? sms.fromNumber : sms.toNumber;

  const sendSms = useMutation({
    mutationFn: () =>
      apiClient.post('/interactions/sms/send', {
        subAccountId,
        toNumber: replyTo,
        text: text.trim(),
      }),
    onSuccess: () => {
      setText('');
      setShowReply(false);
      queryClient.invalidateQueries({ queryKey: ['my-sms'] });
    },
  });

  return (
    <div className="rounded-md border">
      <button
        onClick={onOpen}
        className="flex w-full gap-3 rounded-t-md p-3 text-left hover:bg-muted/40"
      >
        <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {sms.direction === 'inbound' ? 'De' : 'Para'}:{' '}
              <span className="font-mono">{sms.direction === 'inbound' ? sms.fromNumber : sms.toNumber}</span>
              {' · '}
              {sms.subAccount?.name}
            </span>
            <span>{new Date(sms.startedAt).toLocaleString('pt-BR')}</span>
          </div>
          <p className="mt-1 text-sm">{sms.smsBody}</p>
        </div>
      </button>
      <div className="border-t bg-muted/20 px-3 py-1.5">
        {!showReply ? (
          <button
            onClick={() => setShowReply(true)}
            disabled={!subAccountId || !replyTo}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            ↩ Responder {replyTo && `pra ${replyTo}`}
          </button>
        ) : (
          <div className="space-y-2 py-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite a resposta..."
              rows={2}
              maxLength={1600}
              className="w-full resize-none rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{text.length}/1600</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowReply(false);
                    setText('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => sendSms.mutate()}
                  disabled={!text.trim() || sendSms.isPending}
                >
                  <Send className="mr-1 h-3 w-3" />
                  {sendSms.isPending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
            {sendSms.isError && (
              <p className="text-xs text-red-600">
                {(sendSms.error as Error)?.message ?? 'Erro ao enviar SMS'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface Briefing {
  businessSummary?: string;
  targetAudience?: string;
  keyServices?: string[];
  pricingGuidelines?: string;
  faq?: Array<{ q?: string; a?: string; question?: string; answer?: string }>;
  scripts?: { opening?: string; closing?: string; objectionHandling?: string };
  dosAndDonts?: Record<string, unknown>;
}

function ActiveCallView({ call, onDismiss }: { call: unknown; onDismiss: () => void }) {
  const c = call as {
    from_number?: string;
    external_number?: string;
    subAccountId?: string;
    subAccountName?: string;
  };

  const { data: briefing } = useQuery<Briefing | null>({
    queryKey: ['briefing', c.subAccountId],
    queryFn: () => apiClient.get(`/briefings/by-sub-account/${c.subAccountId}`),
    enabled: !!c.subAccountId,
  });

  const dosDontsEntries = briefing?.dosAndDonts ? Object.entries(briefing.dosAndDonts) : [];
  const hasDosDonts = dosDontsEntries.some(([, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    return false;
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
          <BriefCard title="Sobre o cliente" tone="muted">
            <LinkifiedText text={briefing.businessSummary} />
          </BriefCard>
        )}
        {briefing?.targetAudience && (
          <BriefCard title="Público-alvo" tone="muted">
            <LinkifiedText text={briefing.targetAudience} />
          </BriefCard>
        )}
        {briefing?.keyServices && briefing.keyServices.length > 0 && (
          <BriefCard title="Serviços principais" tone="muted">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {briefing.keyServices.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </BriefCard>
        )}
        {briefing?.pricingGuidelines && (
          <BriefCard title="Preços" tone="amber">
            <LinkifiedText text={briefing.pricingGuidelines} />
          </BriefCard>
        )}
        {briefing?.scripts?.opening && (
          <BriefCard title="Script de abertura" tone="blue">
            <LinkifiedText text={briefing.scripts.opening} />
          </BriefCard>
        )}
        {briefing?.scripts?.objectionHandling && (
          <BriefCard title="Lidando com objeções" tone="blue">
            <LinkifiedText text={briefing.scripts.objectionHandling} />
          </BriefCard>
        )}
        {briefing?.scripts?.closing && (
          <BriefCard title="Script de fechamento" tone="blue">
            <LinkifiedText text={briefing.scripts.closing} />
          </BriefCard>
        )}
        {hasDosDonts && (
          <BriefCard title="Faça / Não faça" tone="muted">
            <div className="space-y-2 text-sm">
              {dosDontsEntries.map(([key, value]) => {
                const items = Array.isArray(value)
                  ? (value as unknown[]).map((v) => String(v))
                  : typeof value === 'string'
                    ? [value]
                    : [];
                if (items.length === 0) return null;
                return (
                  <div key={key}>
                    <p className="font-medium capitalize">{key}</p>
                    <ul className="list-disc pl-5">
                      {items.map((it, i) => <li key={i}>{it}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </BriefCard>
        )}
        {briefing?.faq && briefing.faq.length > 0 && (
          <BriefCard title={`FAQ (${briefing.faq.length})`} tone="muted">
            <div className="space-y-2 text-sm">
              {briefing.faq.map((item, i) => {
                const question = (item.q ?? item.question ?? '').trim();
                const answer = (item.a ?? item.answer ?? '').trim();
                if (!question && !answer) return null;
                return (
                  <details key={i} className="rounded border bg-background p-2">
                    <summary className="cursor-pointer font-medium">{question || `Pergunta ${i + 1}`}</summary>
                    <div className="mt-1 pl-2">
                      <LinkifiedText text={answer} />
                    </div>
                  </details>
                );
              })}
            </div>
          </BriefCard>
        )}
        {!briefing && (
          <p className="text-xs text-muted-foreground">Briefing não cadastrado pra esse cliente.</p>
        )}
      </CardContent>
    </Card>
  );
}

function BriefCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone: 'muted' | 'blue' | 'amber';
  children: React.ReactNode;
}) {
  const bg = tone === 'blue' ? 'bg-blue-50' : tone === 'amber' ? 'bg-amber-50' : 'bg-muted/30';
  return (
    <Card className={bg}>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="whitespace-pre-wrap text-sm">
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
