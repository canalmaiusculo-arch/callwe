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
  BookOpen,
  UserPlus,
  Users,
  MessagesSquare,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SoftphoneFrame } from '@/components/agent/softphone-frame';
import { InteractionDrawer } from '@/components/interaction-drawer';
import { LeadDrawer, type LeadDrawerTarget } from '@/components/lead-drawer';
import { NotificationBanner } from '@/components/agent/notification-banner';
import { BriefingDisplay } from '@/components/agent/briefing-display';
import { useAuthStore } from '@/stores/auth-store';
import { ChatWidget } from '@/components/chat-widget';
import { NotificationCenter } from '@/components/notification-center';
import { MessengerInbox } from '@/components/agent/messenger-inbox';
import { useRealtimeCalls, useRealtimeSms } from '@/hooks/use-realtime-calls';
import {
  LEAD_STATUS_COLOR,
  LEAD_STATUS_LABELS,
  LEAD_ACQUISITION_LABELS,
  type LeadStatus,
} from '@/components/interaction-drawer';
import { useSeenIds } from '@/hooks/use-unread';
import { useTranslate } from '@/i18n/provider';

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
  lead: {
    id: string;
    name: string | null;
    status?: LeadStatus;
    customFields?: Record<string, unknown> | null;
  } | null;
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

type Tab = 'dashboard' | 'calls' | 'sms' | 'leads' | 'messenger' | 'briefings';

export default function AgentPage() {
  const { t } = useTranslate();
  const [tab, setTab] = useState<Tab>('calls');
  const [onlyMine, setOnlyMine] = useState(true);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [leadDrawer, setLeadDrawer] = useState<LeadDrawerTarget | null>(null);
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
  const seenSms = useSeenIds('sms');
  const seenCalls = useSeenIds('calls');

  useRealtimeSms(subTags, () => {
    queryClient.invalidateQueries({ queryKey: ['my-sms'] });
    if (tab !== 'sms') setSmsBadge((n) => n + 1);
  });

  const openInteraction = (id: string) => {
    setDrawerId(id);
    seenSms.markSeen(id);
    seenCalls.markSeen(id);
  };

  // Leads novos em destaque: o servidor já devolve só status 'new' (mais recentes);
  // aqui só aplicamos a janela de 7 dias, o "não visto" e o filtro de cliente.
  const { isSeen: isLeadSeen, markSeen: markLeadSeen } = useSeenIds('leads');
  const { data: newLeads = [] } = useQuery<AgentLead[]>({
    queryKey: ['my-leads-new'],
    queryFn: () => apiClient.get('/leads/mine?status=new&limit=200'),
    refetchInterval: 30_000,
  });
  const pendingLeads = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    return newLeads.filter(
      (l) =>
        new Date(l.createdAt).getTime() >= cutoff &&
        !isLeadSeen(l.id) &&
        (filterSubAccountId ? l.subAccount?.id === filterSubAccountId : true),
    );
  }, [newLeads, isLeadSeen, filterSubAccountId]);

  const openLead = (target: LeadDrawerTarget) => {
    setLeadDrawer(target);
    markLeadSeen(target.id);
  };

  useEffect(() => {
    if (tab === 'sms') setSmsBadge(0);
  }, [tab]);

  // Limpa busca ao trocar de tab
  useEffect(() => setSearch(''), [tab]);

  return (
    <div className="grid h-screen grid-cols-12 gap-3 bg-muted/20 p-3">
      <ChatWidget />
      <NotificationCenter />
      <aside className="col-span-2 flex flex-col rounded-lg border bg-background p-3">
        <div className="mb-3">
          <p className="text-xs uppercase text-muted-foreground">{t('agentPanel.agentLabel')}</p>
          <p className="text-sm font-semibold">{t('agentPanel.livePanel')}</p>
        </div>

        <nav className="mb-3 space-y-1">
          <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={Gauge} label={t('agentPanel.tabDashboard')} />
          <TabButton active={tab === 'calls'} onClick={() => setTab('calls')} icon={Phone} label={t('agentPanel.tabCalls')} />
          <TabButton active={tab === 'sms'} onClick={() => setTab('sms')} icon={MessageSquare} label={t('agentPanel.tabSms')} badge={smsBadge} />
          <TabButton active={tab === 'leads'} onClick={() => setTab('leads')} icon={UserPlus} label={t('agentPanel.tabLeads')} badge={pendingLeads.length} pulse />
          <TabButton active={tab === 'messenger'} onClick={() => setTab('messenger')} icon={MessagesSquare} label={t('agentPanel.tabMessenger')} />
          <TabButton active={tab === 'briefings'} onClick={() => setTab('briefings')} icon={BookOpen} label={t('agentPanel.tabBriefings')} />
        </nav>

        <div className="mt-2 flex min-h-0 flex-1 flex-col border-t pt-3">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            {t('agentPanel.myClients')} ({clients.length})
          </p>
          <div className="flex-1 space-y-0.5 overflow-auto">
            <button
              onClick={() => setFilterSubAccountId(null)}
              className={`w-full rounded px-2 py-1 text-left text-xs ${
                filterSubAccountId === null ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t('agentPanel.allClients')}
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
          {t('agentPanel.logout')}
        </button>
      </aside>

      <section className="col-span-7 min-h-0 space-y-3 overflow-auto">
        <NotificationBanner />
        {activeCall && (
          <div className="sticky top-0 z-20 -mx-3 -mt-3 mb-3 border-b bg-muted/40 px-3 pb-3 pt-3 backdrop-blur">
            <ActiveCallView call={activeCall} onDismiss={dismissActiveCall} />
          </div>
        )}
        {pendingLeads.length > 0 && (
          <NewLeadsHighlight leads={pendingLeads} onOpen={openLead} />
        )}
        {(tab === 'calls' || tab === 'sms' || tab === 'leads') && (
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={
              tab === 'calls'
                ? t('agentPanel.searchCallsPlaceholder')
                : tab === 'sms'
                  ? t('agentPanel.searchSmsPlaceholder')
                  : t('agentPanel.searchLeadsPlaceholder')
            }
          />
        )}
        {tab === 'dashboard' ? (
          <DashboardView />
        ) : tab === 'calls' ? (
          <CallsView
            onlyMine={onlyMine}
            onToggleMine={() => setOnlyMine(!onlyMine)}
            onOpen={openInteraction}
            filterSubAccountId={filterSubAccountId}
            search={search}
            isSeen={seenCalls.isSeen}
          />
        ) : tab === 'sms' ? (
          <SmsView
            onlyMine={onlyMine}
            onToggleMine={() => setOnlyMine(!onlyMine)}
            onOpen={openInteraction}
            filterSubAccountId={filterSubAccountId}
            search={search}
            isSeen={seenSms.isSeen}
          />
        ) : tab === 'leads' ? (
          <LeadsView
            filterSubAccountId={filterSubAccountId}
            search={search}
            clients={clients}
            onOpenLead={openLead}
          />
        ) : tab === 'messenger' ? (
          <MessengerInbox filterSubAccountId={filterSubAccountId} />
        ) : (
          <BriefingsView clients={clients} initialSelectedId={filterSubAccountId} />
        )}
      </section>

      <aside className="col-span-3">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-sm">{t('agentPanel.softphone')}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-2">
            <SoftphoneFrame />
          </CardContent>
        </Card>
      </aside>

      <LeadDrawer
        lead={leadDrawer}
        onClose={() => setLeadDrawer(null)}
        onOpenInteraction={openInteraction}
      />
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
  pulse,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{label}</span>
      {badge && badge > 0 ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs font-semibold text-white ${
            pulse ? 'animate-pulse bg-blue-600' : 'bg-emerald-500'
          }`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
}

function DashboardView() {
  const { t } = useTranslate();
  const { data: stats } = useQuery<AgentStats>({
    queryKey: ['agent-stats'],
    queryFn: () => apiClient.get<AgentStats>('/interactions/mine/stats'),
    refetchInterval: 30_000,
  });

  const s = stats ?? { callsToday: 0, callsWeek: 0, totalTalkTimeToday: 0, avgTalkTime: 0, smsToday: 0 };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('agentPanel.myPerformance')}</h1>
        <p className="text-sm text-muted-foreground">{t('agentPanel.updatesEvery30s')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard title={t('agentPanel.callsToday')} value={s.callsToday} icon={Phone} />
        <StatCard title={t('agentPanel.calls7d')} value={s.callsWeek} icon={LayoutDashboard} />
        <StatCard title={t('agentPanel.smsToday')} value={s.smsToday} icon={MessageSquare} />
        <StatCard title={t('agentPanel.talkTimeToday')} value={formatDuration(s.totalTalkTimeToday)} icon={Clock} />
        <StatCard title={t('agentPanel.avgTalkTime')} value={formatDuration(s.avgTalkTime)} icon={Clock} />
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
  isSeen,
}: {
  onlyMine: boolean;
  onToggleMine: () => void;
  onOpen: (id: string) => void;
  filterSubAccountId: string | null;
  search: string;
  isSeen: (id: string) => boolean;
}) {
  const { t } = useTranslate();
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
          {t('agentPanel.calls')} {onlyMine ? t('agentPanel.scopeMineCalls') : t('agentPanel.scopeAllClients')}
          {(filterSubAccountId || search) && (
            <span className="ml-2 text-xs text-muted-foreground">{filtered.length}/{calls.length}</span>
          )}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={onToggleMine}>
          {onlyMine ? t('agentPanel.seeAll') : t('agentPanel.onlyMine')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
            <Phone className="mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">{calls.length === 0 ? t('agentPanel.noCalls') : t('agentPanel.noCallsMatch')}</p>
          </div>
        )}
        {filtered.map((c) => (
          <CallRow key={c.id} call={c} onClick={() => onOpen(c.id)} unread={!isSeen(c.id) && needsAttention(c)} />
        ))}
      </CardContent>
    </Card>
  );
}

function needsAttention(call: Interaction): boolean {
  // "Sem status trabalhado" = lead.status indefinido OU 'new'
  const leadStatus = call.lead?.status;
  return !leadStatus || leadStatus === 'new';
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
  const { t } = useTranslate();
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
          aria-label={t('agentPanel.clearSearch')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function CallRow({ call, onClick, unread }: { call: Interaction; onClick: () => void; unread?: boolean }) {
  const { t } = useTranslate();
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
      <div className="relative">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        {unread && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">{t('agentPanel.from')}</p>
          <p className="font-mono">{call.fromNumber ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('agentPanel.client')}</p>
          <p>{call.subAccount?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('agentPanel.lead')}</p>
          <p className="flex flex-wrap items-center gap-1.5">
            <span>{call.lead?.name ?? call.fromNumber ?? '—'}</span>
            {call.lead?.status && (
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${LEAD_STATUS_COLOR[call.lead.status]}`}>
                {LEAD_STATUS_LABELS[call.lead.status]}
              </span>
            )}
            {(() => {
              const ch = call.lead?.customFields?.acquisitionChannel as string | undefined;
              if (!ch) return null;
              const label = LEAD_ACQUISITION_LABELS[ch as keyof typeof LEAD_ACQUISITION_LABELS] ?? ch;
              return (
                <span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                  {label}
                </span>
              );
            })()}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('agentPanel.when')}</p>
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
  isSeen,
}: {
  onlyMine: boolean;
  onToggleMine: () => void;
  onOpen: (id: string) => void;
  filterSubAccountId: string | null;
  search: string;
  isSeen: (id: string) => boolean;
}) {
  const { t } = useTranslate();
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
          {t('agentPanel.sms')} {onlyMine ? t('agentPanel.scopeMineSms') : t('agentPanel.scopeAllClients')}
          {(filterSubAccountId || search) && (
            <span className="ml-2 text-xs text-muted-foreground">{filtered.length}/{messages.length}</span>
          )}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={onToggleMine}>
          {onlyMine ? t('agentPanel.seeAll') : t('agentPanel.onlyMine')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {messages.length === 0 ? t('agentPanel.noMessages') : t('agentPanel.noMessagesMatch')}
          </p>
        )}
        {filtered.map((m) => (
          <SmsRow
            key={m.id}
            sms={m}
            onOpen={() => onOpen(m.id)}
            unread={m.direction === 'inbound' && !isSeen(m.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function SmsRow({ sms, onOpen, unread }: { sms: Interaction; onOpen: () => void; unread?: boolean }) {
  const { t } = useTranslate();
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
        <div className="relative">
          <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
          {unread && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {sms.direction === 'inbound' ? t('agentPanel.from') : t('agentPanel.to')}:{' '}
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
            ↩ {t('agentPanel.reply')} {replyTo && `${t('agentPanel.replyTo')} ${replyTo}`}
          </button>
        ) : (
          <div className="space-y-2 py-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('agentPanel.replyPlaceholder')}
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
                  {t('agentPanel.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => sendSms.mutate()}
                  disabled={!text.trim() || sendSms.isPending}
                >
                  <Send className="mr-1 h-3 w-3" />
                  {sendSms.isPending ? t('agentPanel.sending') : t('agentPanel.send')}
                </Button>
              </div>
            </div>
            {sendSms.isError && (
              <p className="text-xs text-red-600">
                {(sendSms.error as Error)?.message ?? t('agentPanel.smsSendError')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveCallView({ call, onDismiss }: { call: unknown; onDismiss: () => void }) {
  const { t } = useTranslate();
  const c = call as {
    from_number?: string;
    external_number?: string;
    subAccountId?: string;
    subAccountName?: string;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-100 p-3">
            <PhoneIncoming className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase text-muted-foreground">
              {t('agentPanel.incomingCall')} {c.subAccountName && `· ${c.subAccountName}`}
            </p>
            <CardTitle className="text-2xl">{c.external_number ?? c.from_number ?? '—'}</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={onDismiss}>{t('agentPanel.close')}</Button>
        </div>
      </CardHeader>
      <CardContent>
        <BriefingDisplay subAccountId={c.subAccountId} />
      </CardContent>
    </Card>
  );
}

function BriefingsView({
  clients,
  initialSelectedId,
}: {
  clients: AssignedClient[];
  initialSelectedId: string | null;
}) {
  const { t } = useTranslate();
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? clients[0]?.id ?? null,
  );

  useEffect(() => {
    if (initialSelectedId) setSelectedId(initialSelectedId);
  }, [initialSelectedId]);

  useEffect(() => {
    const first = clients[0];
    if (!selectedId && first) setSelectedId(first.id);
  }, [clients, selectedId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <CardTitle>{t('agentPanel.briefings')}</CardTitle>
        <select
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="ml-auto h-9 rounded-md border bg-background px-3 text-sm"
        >
          {clients.length === 0 && <option value="">{t('agentPanel.noClient')}</option>}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </CardHeader>
      <CardContent>
        <BriefingDisplay subAccountId={selectedId} />
      </CardContent>
    </Card>
  );
}

interface AgentLead {
  id: string;
  name: string | null;
  phoneE164: string | null;
  email: string | null;
  status: LeadStatus;
  source: string;
  createdAt: string;
  customFields: Record<string, unknown> | null;
  subAccount: { id: string; name: string } | null;
  owner: { id: string; fullName: string } | null;
}

type DateRange = 'today' | '7d' | '30d' | 'all';
type SourceFilter = 'all' | 'meta_ads' | 'google_ads' | 'inbound_call' | 'outbound_call' | 'sms' | 'manual' | 'api' | 'form';

const DATE_LABEL_KEYS: Record<DateRange, string> = {
  today: 'agentPanel.dateToday',
  '7d': 'agentPanel.dateLast7d',
  '30d': 'agentPanel.dateLast30d',
  all: 'agentPanel.dateAll',
};

const SOURCE_FILTER_LABEL_KEYS: Record<SourceFilter, string> = {
  all: 'agentPanel.sourceAll',
  meta_ads: 'agentPanel.sourceMeta',
  google_ads: 'agentPanel.sourceGoogle',
  inbound_call: 'agentPanel.sourceInboundCall',
  outbound_call: 'agentPanel.sourceOutboundCall',
  sms: 'agentPanel.sourceSms',
  manual: 'agentPanel.sourceManual',
  api: 'agentPanel.sourceApi',
  form: 'agentPanel.sourceForm',
};

function NewLeadsHighlight({
  leads,
  onOpen,
}: {
  leads: AgentLead[];
  onOpen: (lead: LeadDrawerTarget) => void;
}) {
  const { t } = useTranslate();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? leads : leads.slice(0, 5);

  return (
    <div className="rounded-lg border-2 border-blue-400 bg-blue-50 p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
        </span>
        <p className="text-sm font-semibold text-blue-800">
          {t('agentPanel.newLeadsTitle')} ({leads.length})
        </p>
      </div>
      <div className="space-y-1.5">
        {shown.map((l) => {
          const ch = l.customFields?.acquisitionChannel as string | undefined;
          const sourceKey = SOURCE_LABEL_KEYS[l.source];
          const channelLabel =
            (ch && LEAD_ACQUISITION_LABELS[ch as keyof typeof LEAD_ACQUISITION_LABELS]) ??
            (sourceKey ? t(sourceKey) : l.source);
          const ageMin = Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 60_000);
          const ageLabel =
            ageMin < 1
              ? t('agentPanel.ageNow')
              : ageMin < 60
                ? `${ageMin}min`
                : ageMin < 1440
                  ? `${Math.floor(ageMin / 60)}h`
                  : new Date(l.createdAt).toLocaleDateString('pt-BR');
          return (
            <button
              key={l.id}
              onClick={() =>
                onOpen({
                  id: l.id,
                  subAccountId: l.subAccount?.id,
                  subAccountName: l.subAccount?.name,
                  name: l.name,
                  phoneE164: l.phoneE164,
                  email: l.email,
                  status: l.status,
                  createdAt: l.createdAt,
                })
              }
              className="flex w-full items-center justify-between gap-3 rounded-md border border-blue-200 bg-white p-2 text-left transition-colors hover:bg-blue-100/60"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {l.name ?? l.phoneE164 ?? l.email ?? '—'}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {channelLabel}
                    {l.subAccount?.name ? ` · ${l.subAccount.name}` : ''} · {ageLabel}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-medium text-white">
                {t('agentPanel.newLeadsView')}
              </span>
            </button>
          );
        })}
      </div>
      {leads.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-medium text-blue-700 hover:underline"
        >
          {expanded ? t('agentPanel.newLeadsLess') : `+${leads.length - 5} ${t('agentPanel.newLeadsMore')}`}
        </button>
      )}
    </div>
  );
}

function LeadsView({
  filterSubAccountId,
  search,
  clients,
  onOpenLead,
}: {
  filterSubAccountId: string | null;
  search: string;
  clients: AssignedClient[];
  onOpenLead: (lead: LeadDrawerTarget) => void;
}) {
  const { t } = useTranslate();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [clientFilter, setClientFilter] = useState<string>('');

  // Sidebar global (filterSubAccountId) tem prioridade; senão usa o filtro local da tab.
  const effectiveClientId = filterSubAccountId ?? (clientFilter || '');
  // Debounce pra não disparar uma requisição a cada tecla digitada.
  const debouncedSearch = useDebounced(search.trim(), 350);

  // Filtros aplicados NO SERVIDOR — assim achamos leads de qualquer época,
  // sem depender de quantos vieram na primeira carga.
  const {
    data: leads = [],
    isLoading,
    isFetching,
  } = useQuery<AgentLead[]>({
    queryKey: ['my-leads', dateRange, sourceFilter, effectiveClientId, debouncedSearch],
    queryFn: () => {
      const p = new URLSearchParams({ limit: '500' });
      const from = rangeStart(dateRange);
      if (from) p.set('from', from.toISOString());
      if (sourceFilter !== 'all') p.set('source', sourceFilter);
      if (effectiveClientId) p.set('subAccountId', effectiveClientId);
      if (debouncedSearch) p.set('search', debouncedSearch);
      return apiClient.get(`/leads/mine?${p.toString()}`);
    },
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });

  const filtered = leads;
  const hasActiveFilter =
    filterSubAccountId || clientFilter || dateRange !== '30d' || sourceFilter !== 'all' || search;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-row items-center justify-between">
          <CardTitle>
            {t('agentPanel.leads')}
            {hasActiveFilter && (
              <span className="ml-2 text-xs text-muted-foreground">{filtered.length}</span>
            )}
            {isFetching && !isLoading && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">…</span>
            )}
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={dateRange}
            onChange={(v) => setDateRange(v as DateRange)}
            options={Object.entries(DATE_LABEL_KEYS).map(([v, k]) => ({ value: v, label: t(k) }))}
          />
          <FilterSelect
            value={sourceFilter}
            onChange={(v) => setSourceFilter(v as SourceFilter)}
            options={Object.entries(SOURCE_FILTER_LABEL_KEYS).map(([v, k]) => ({ value: v, label: t(k) }))}
          />
          <FilterSelect
            value={clientFilter}
            onChange={setClientFilter}
            options={[
              { value: '', label: t('agentPanel.allClients') },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
            disabled={!!filterSubAccountId}
            disabledHint={filterSubAccountId ? t('agentPanel.filterActiveInSidebar') : undefined}
          />
          {hasActiveFilter && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDateRange('30d');
                setSourceFilter('all');
                setClientFilter('');
              }}
            >
              {t('agentPanel.clear')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">{t('agentPanel.loading')}</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
            <Users className="mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">
              {leads.length === 0 ? t('agentPanel.noLeads') : t('agentPanel.noLeadsMatch')}
            </p>
          </div>
        )}
        {filtered.map((l) => (
          <LeadRow key={l.id} lead={l} onOpen={onOpenLead} />
        ))}
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  disabled,
  disabledHint,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      className="h-8 rounded-md border bg-background px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

const SOURCE_LABEL_KEYS: Record<string, string> = {
  meta_ads: 'agentPanel.sourceMeta',
  google_ads: 'agentPanel.sourceGoogle',
  inbound_call: 'agentPanel.sourceCall',
  outbound_call: 'agentPanel.sourceDialed',
  sms: 'agentPanel.sourceSms',
  manual: 'agentPanel.sourceManual',
  api: 'agentPanel.sourceApiShort',
  import: 'agentPanel.sourceImport',
  form: 'agentPanel.sourceForm',
};

function LeadRow({ lead, onOpen }: { lead: AgentLead; onOpen: (lead: LeadDrawerTarget) => void }) {
  const { t } = useTranslate();
  const ch = lead.customFields?.acquisitionChannel as string | undefined;
  const sourceKey = SOURCE_LABEL_KEYS[lead.source];
  const channelLabel =
    (ch && LEAD_ACQUISITION_LABELS[ch as keyof typeof LEAD_ACQUISITION_LABELS]) ??
    (sourceKey ? t(sourceKey) : lead.source);
  const formName = lead.customFields?.formName as string | undefined;
  const when = new Date(lead.createdAt);
  const ageMin = Math.floor((Date.now() - when.getTime()) / 60_000);
  const ageLabel =
    ageMin < 1 ? t('agentPanel.ageNow') : ageMin < 60 ? `${ageMin}min` : ageMin < 1440 ? `${Math.floor(ageMin / 60)}h` : when.toLocaleDateString('pt-BR');

  return (
    <button
      onClick={() =>
        onOpen({
          id: lead.id,
          subAccountId: lead.subAccount?.id,
          subAccountName: lead.subAccount?.name,
          name: lead.name,
          phoneE164: lead.phoneE164,
          email: lead.email,
          status: lead.status,
          createdAt: lead.createdAt,
        })
      }
      className="flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
        <UserPlus className="h-4 w-4 text-blue-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{lead.name ?? lead.phoneE164 ?? lead.email ?? '—'}</p>
          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${LEAD_STATUS_COLOR[lead.status]}`}>
            {LEAD_STATUS_LABELS[lead.status]}
          </span>
          <span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
            {channelLabel}
          </span>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-muted-foreground sm:grid-cols-4">
          <div>
            <p className="text-[10px] uppercase">{t('agentPanel.client')}</p>
            <p>{lead.subAccount?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase">{t('agentPanel.phone')}</p>
            <p className="font-mono">{lead.phoneE164 ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase">{t('agentPanel.email')}</p>
            <p className="truncate">{lead.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase">{t('agentPanel.when')}</p>
            <p>{ageLabel}</p>
          </div>
        </div>
        {formName && (
          <p className="mt-1 text-[11px] text-muted-foreground">📝 {formName}</p>
        )}
      </div>
    </button>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Atrasa o valor — evita uma requisição por tecla digitada na busca. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/** Início do período selecionado (null = sem limite de data). */
function rangeStart(range: DateRange): Date | null {
  if (range === 'all') return null;
  if (range === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const days = range === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 3600 * 1000);
}
