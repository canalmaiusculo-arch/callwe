'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Phone,
  Users,
  Clock,
  PhoneMissed,
  Trophy,
  Target,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MiniLineChart } from '@/components/line-chart';
import { useTenantStore } from '@/stores/tenant-store';

interface RecentCall {
  at: string;
  direction: string;
  status: string;
  durationSeconds: number;
  number: string | null;
  leadName: string | null;
  aiSummary: string | null;
  sentiment: string | null;
  aiScore: number | null;
}

interface DashboardStats {
  leadsToday: number;
  callsToday: number;
  missedCalls: number;
  avgHandleTime: number;
  avgWaitingTime: number;
  callsWeek: number;
  inboundWeek: number;
  outboundWeek: number;
  leadsWeek: number;
  wonWeek: number;
  qualifiedWeek: number;
  lostWeek: number;
  conversionRateWon: number;
  winRate: number;
  series: Array<{ day: string; count: number }>;
  hourlySeries: Array<{ hour: number; count: number }>;
  statusBreakdown: Array<{ status: string; count: number; percent: number }>;
  leadsBySource: Array<{ source: string; count: number }>;
  details: {
    recentLeads: Array<{ name: string; source: string; status: string; at: string }>;
    recentCalls: RecentCall[];
    missed: Array<{ at: string; number: string | null; leadName: string | null }>;
    talk: { avgSeconds: number; longest: { seconds: number; leadName: string | null } | null };
  };
}

const EMPTY: DashboardStats = {
  leadsToday: 0, callsToday: 0, missedCalls: 0, avgHandleTime: 0, avgWaitingTime: 0,
  callsWeek: 0, inboundWeek: 0, outboundWeek: 0, leadsWeek: 0, wonWeek: 0, qualifiedWeek: 0,
  lostWeek: 0, conversionRateWon: 0, winRate: 0, series: [], hourlySeries: [], statusBreakdown: [],
  leadsBySource: [],
  details: { recentLeads: [], recentCalls: [], missed: [], talk: { avgSeconds: 0, longest: null } },
};

const SOURCE_LABEL: Record<string, string> = {
  inbound_call: 'Chamada entrante', outbound_call: 'Chamada saída', meta_ads: 'Meta Ads',
  sms: 'SMS', manual: 'Manual', import: 'Importação', api: 'API', form: 'Formulário',
};
const STATUS_LABEL: Record<string, string> = {
  new: 'Novo', contacted: 'Contatado', qualified: 'Qualificado', won: 'Ganho', lost: 'Perdido',
};
const STATUS_ORDER = ['new', 'contacted', 'qualified', 'won', 'lost'];
const STATUS_COLOR: Record<string, string> = {
  new: 'bg-slate-400', contacted: 'bg-blue-500', qualified: 'bg-amber-500',
  won: 'bg-emerald-500', lost: 'bg-red-500',
};
const SENTIMENT: Record<string, { label: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  positive: { label: 'positivo', variant: 'success' },
  neutral: { label: 'neutro', variant: 'secondary' },
  negative: { label: 'negativo', variant: 'destructive' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function fmtClock(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ClientDashboard() {
  const { setTenant, subAccountId } = useTenantStore();

  const { data: mySubs } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['my-sub-accounts'],
    queryFn: () => apiClient.get('/sub-accounts/mine'),
  });
  useEffect(() => {
    if (!subAccountId && mySubs && mySubs.length > 0) setTenant(mySubs[0]!.id, mySubs[0]!.name);
  }, [mySubs, subAccountId, setTenant]);

  const { data } = useQuery<DashboardStats>({
    queryKey: ['client-dashboard-stats', subAccountId],
    queryFn: () => apiClient.get('/dashboard/stats'),
    enabled: !!subAccountId,
    refetchInterval: 60_000,
  });

  const s = data ?? EMPTY;
  const aiCalls = s.details.recentCalls.filter((c) => c.aiSummary);
  const maxSource = Math.max(1, ...s.leadsBySource.map((r) => r.count));
  const peakHour = s.hourlySeries.reduce((max, h) => (h.count > max.count ? h : max), { hour: 0, count: 0 });
  const maxHour = Math.max(1, ...s.hourlySeries.map((h) => h.count));

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold">Meu painel</h1>
      <p className="mt-1 text-muted-foreground">Visão de hoje e dos últimos 7 dias</p>

      {/* KPIs do dia (com detalhes no hover) */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard title="Leads hoje" value={s.leadsToday} icon={Users}>
          <DetailLeads rows={s.details.recentLeads} />
        </KpiCard>
        <KpiCard title="Chamadas hoje" value={s.callsToday} icon={Phone}>
          <DetailCalls rows={s.details.recentCalls} />
        </KpiCard>
        <KpiCard title="Perdidas hoje" value={s.missedCalls} icon={PhoneMissed} tone="warning">
          <DetailMissed rows={s.details.missed} />
        </KpiCard>
        <KpiCard title="TMA" value={fmtClock(s.avgHandleTime)} icon={Clock}>
          <DetailTalk talk={s.details.talk} wait={s.avgWaitingTime} />
        </KpiCard>
      </div>

      {/* KPIs da semana */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi title="Chamadas (7d)" value={s.callsWeek} icon={Phone} sub={`${s.inboundWeek} receb. · ${s.outboundWeek} feitas`} />
        <Kpi title="Leads (7d)" value={s.leadsWeek} icon={Users} />
        <Kpi title="Leads fechados" value={s.wonWeek} icon={Trophy} sub={`${s.qualifiedWeek} qualificados`} />
        <Kpi title="Conversão" value={`${s.conversionRateWon}%`} icon={Target} sub={`win rate ${s.winRate}%`} />
      </div>

      {/* Feedback da IA */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-secondary" /> Resumo das ligações (IA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiCalls.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Os resumos gerados por IA aparecerão aqui conforme as ligações forem analisadas.
            </p>
          )}
          {aiCalls.map((c, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  {c.direction === 'inbound' ? (
                    <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="font-medium">{c.leadName ?? c.number ?? '—'}</span>
                  <span className="text-xs text-muted-foreground">{fmtTime(c.at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {c.aiScore != null && <Badge variant="outline">nota {c.aiScore}</Badge>}
                  {c.sentiment && SENTIMENT[c.sentiment] && (
                    <Badge variant={SENTIMENT[c.sentiment]!.variant}>{SENTIMENT[c.sentiment]!.label}</Badge>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{c.aiSummary}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Volume de chamadas — 7 dias</CardTitle></CardHeader>
          <CardContent><MiniLineChart data={s.series} height={140} color="#3b82f6" /></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horários de pico</CardTitle>
            <p className="text-xs text-muted-foreground">
              {peakHour.count > 0 ? `Mais movimento às ${String(peakHour.hour).padStart(2, '0')}h` : 'Sem dados ainda'}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex h-[140px] items-end gap-0.5">
              {s.hourlySeries.map((h) => (
                <div
                  key={h.hour}
                  title={`${String(h.hour).padStart(2, '0')}h: ${h.count}`}
                  className="flex-1 rounded-t bg-secondary/70"
                  style={{ height: `${(h.count / maxHour) * 100}%`, minHeight: h.count > 0 ? 2 : 0 }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Funil */}
        <Card>
          <CardHeader><CardTitle>Funil de leads</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {STATUS_ORDER.map((st) => {
              const row = s.statusBreakdown.find((r) => r.status === st);
              const count = row?.count ?? 0;
              const percent = row?.percent ?? 0;
              return (
                <div key={st}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{STATUS_LABEL[st] ?? st}</span>
                    <span className="text-muted-foreground">{count} · {percent}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${STATUS_COLOR[st]}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Origem */}
        <Card>
          <CardHeader><CardTitle>Leads por origem (7d)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {s.leadsBySource.length === 0 && <p className="text-sm text-muted-foreground">Sem leads no período.</p>}
            {s.leadsBySource.map((r) => (
              <div key={r.source}>
                <div className="flex items-center justify-between text-sm">
                  <span>{SOURCE_LABEL[r.source] ?? r.source}</span>
                  <span className="font-medium">{r.count}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(r.count / maxSource) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  title, value, icon: Icon, sub, tone,
}: {
  title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; sub?: string; tone?: 'warning';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${tone === 'warning' ? 'text-amber-600' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  title, value, icon: Icon, tone, children,
}: {
  title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; tone?: 'warning'; children: React.ReactNode;
}) {
  const [pinned, setPinned] = useState(false);
  return (
    <div className="group relative">
      <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setPinned((p) => !p)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${tone === 'warning' ? 'text-amber-600' : ''}`}>{value}</p>
        </CardContent>
      </Card>
      <div className={`absolute left-0 right-0 top-full z-20 pt-1.5 ${pinned ? 'block' : 'hidden group-hover:block'}`}>
        <div className="max-h-72 overflow-auto rounded-lg border bg-card p-3 text-xs shadow-lg">{children}</div>
      </div>
    </div>
  );
}

function Empty() {
  return <p className="text-muted-foreground">Sem registros no período.</p>;
}

function DetailLeads({ rows }: { rows: DashboardStats['details']['recentLeads'] }) {
  if (rows.length === 0) return <Empty />;
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center justify-between gap-3">
          <span className="truncate font-medium">{r.name}</span>
          <span className="shrink-0 text-muted-foreground">
            {SOURCE_LABEL[r.source] ?? r.source} · {STATUS_LABEL[r.status] ?? r.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DetailCalls({ rows }: { rows: RecentCall[] }) {
  if (rows.length === 0) return <Empty />;
  return (
    <ul className="space-y-1.5">
      {rows.map((c, i) => (
        <li key={i} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1">
            {c.direction === 'inbound' ? (
              <ArrowDownLeft className="h-3 w-3 shrink-0 text-emerald-600" />
            ) : (
              <ArrowUpRight className="h-3 w-3 shrink-0 text-blue-600" />
            )}
            <span className="truncate">{c.leadName ?? c.number ?? '—'}</span>
          </span>
          <span className="shrink-0 text-muted-foreground">
            {c.status === 'missed' ? 'perdida' : fmtClock(c.durationSeconds)} · {fmtTime(c.at)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DetailMissed({ rows }: { rows: DashboardStats['details']['missed'] }) {
  if (rows.length === 0) return <Empty />;
  return (
    <ul className="space-y-1.5">
      {rows.map((m, i) => (
        <li key={i} className="flex items-center justify-between gap-3">
          <span className="truncate font-medium">{m.number ?? m.leadName ?? '—'}</span>
          <span className="shrink-0 text-muted-foreground">{fmtTime(m.at)}</span>
        </li>
      ))}
    </ul>
  );
}

function DetailTalk({ talk, wait }: { talk: DashboardStats['details']['talk']; wait: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Média por chamada</span>
        <span className="font-medium">{fmtClock(talk.avgSeconds)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Tempo médio de espera</span>
        <span className="font-medium">{fmtClock(wait)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Chamada mais longa</span>
        <span className="font-medium">
          {talk.longest ? `${fmtClock(talk.longest.seconds)}${talk.longest.leadName ? ` · ${talk.longest.leadName}` : ''}` : '—'}
        </span>
      </div>
    </div>
  );
}
