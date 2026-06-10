'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Phone,
  PhoneMissed,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MiniLineChart } from '@/components/line-chart';
import { useAdminViewStore } from '@/stores/admin-view-store';

type Period = 'today' | '7d' | '30d';

interface CallDetail {
  at: string;
  client: string;
  direction: string;
  status: string;
  durationSeconds: number;
  number: string | null;
}

interface AgencyStats {
  period: Period;
  totalClients: number;
  leads: number;
  calls: number;
  missed: number;
  talkSeconds: number;
  prev: { leads: number; calls: number; missed: number; talkSeconds: number };
  leadsBySource: Array<{ source: string; count: number }>;
  details: {
    missed: Array<{ at: string; client: string; number: string | null }>;
    calls: { inbound: number; outbound: number; recent: CallDetail[] };
    leads: Array<{ at: string; client: string; name: string; source: string }>;
    talk: { avgSeconds: number; longest: { seconds: number; client: string } | null };
  };
  topClients: Array<{ subAccountId: string; name: string; calls: number }>;
  series: Array<{ day: string; count: number }>;
  clients: Array<{ id: string; name: string }>;
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
};

const SOURCE_LABEL: Record<string, string> = {
  meta_ads: 'Meta',
  form: 'Formulário',
  inbound_call: 'Chamada recebida',
  outbound_call: 'Chamada feita',
  sms: 'SMS',
  manual: 'Manual',
  import: 'Importação',
  api: 'API',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AgencyDashboard() {
  const viewAsAgencyId = useAdminViewStore((s) => s.viewAsAgencyId);
  const [period, setPeriod] = useState<Period>('7d');
  const [clientId, setClientId] = useState<string>('');

  const { data } = useQuery<AgencyStats>({
    queryKey: ['agency-stats', viewAsAgencyId, period, clientId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (viewAsAgencyId) params.set('agencyId', viewAsAgencyId);
      params.set('period', period);
      if (clientId) params.set('subAccountId', clientId);
      return apiClient.get<AgencyStats>(`/dashboard/agency-stats?${params.toString()}`);
    },
    refetchInterval: 60_000,
  });

  const s: AgencyStats = data ?? {
    period,
    totalClients: 0,
    leads: 0,
    calls: 0,
    missed: 0,
    talkSeconds: 0,
    prev: { leads: 0, calls: 0, missed: 0, talkSeconds: 0 },
    leadsBySource: [],
    details: {
      missed: [],
      calls: { inbound: 0, outbound: 0, recent: [] },
      leads: [],
      talk: { avgSeconds: 0, longest: null },
    },
    topClients: [],
    series: [],
    clients: [],
  };

  const periodLabel = PERIOD_LABELS[period].toLowerCase();
  const maxSource = Math.max(1, ...s.leadsBySource.map((r) => r.count));

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Visão geral da agência</h1>
        <p className="mt-1 text-muted-foreground">{s.totalClients} clientes ativos</p>
      </header>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          {(['today', '7d', '30d'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="h-9 rounded-md border bg-card px-3 text-sm"
        >
          <option value="">Todos os clientes</option>
          {s.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <p className="ml-auto hidden text-xs text-muted-foreground sm:block">
          Passe o mouse (ou toque) nos cards para ver os detalhes
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          title="Leads"
          sub={periodLabel}
          value={s.leads}
          icon={Users}
          cur={s.leads}
          prev={s.prev.leads}
        >
          <DetailLeads rows={s.details.leads} />
        </KpiCard>

        <KpiCard
          title="Chamadas"
          sub={periodLabel}
          value={s.calls}
          icon={Phone}
          cur={s.calls}
          prev={s.prev.calls}
        >
          <DetailCalls calls={s.details.calls} />
        </KpiCard>

        <KpiCard
          title="Perdidas"
          sub={periodLabel}
          value={s.missed}
          icon={PhoneMissed}
          tone="warning"
          cur={s.missed}
          prev={s.prev.missed}
          invert
        >
          <DetailMissed rows={s.details.missed} />
        </KpiCard>

        <KpiCard
          title="Tempo ao telefone"
          sub={periodLabel}
          value={formatDuration(s.talkSeconds)}
          icon={Clock}
          cur={s.talkSeconds}
          prev={s.prev.talkSeconds}
        >
          <DetailTalk talk={s.details.talk} />
        </KpiCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chamadas — {periodLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniLineChart data={s.series} height={140} color="#10b981" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads por origem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.leadsBySource.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem leads no período.</p>
            )}
            {s.leadsBySource.map((r) => (
              <div key={r.source}>
                <div className="flex items-center justify-between text-sm">
                  <span>{SOURCE_LABEL[r.source] ?? r.source}</span>
                  <span className="font-medium">{r.count}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(r.count / maxSource) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Clientes com mais chamadas ({periodLabel})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.topClients.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            )}
            {s.topClients.map((c) => (
              <Link key={c.subAccountId} href={`/agency/clients/${c.subAccountId}` as never}>
                <div className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/30">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-sm text-muted-foreground">{c.calls} chamadas</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DeltaBadge({ cur, prev, invert }: { cur: number; prev: number; invert?: boolean }) {
  if (prev === 0) {
    if (cur === 0) return null;
    return <span className="text-xs font-medium text-emerald-600">novo</span>;
  }
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return <span className="text-xs text-muted-foreground">0%</span>;
  const up = pct > 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${
        good ? 'text-emerald-600' : 'text-red-600'
      }`}
      title="vs. período anterior"
    >
      <Icon className="h-3 w-3" />
      {Math.abs(pct)}%
    </span>
  );
}

function KpiCard({
  title,
  sub,
  value,
  icon: Icon,
  tone,
  cur,
  prev,
  invert,
  children,
}: {
  title: string;
  sub?: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'warning';
  cur: number;
  prev: number;
  invert?: boolean;
  children: React.ReactNode;
}) {
  const [pinned, setPinned] = useState(false);
  return (
    <div className="group relative">
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => setPinned((p) => !p)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
          </div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <p className={`text-2xl font-bold ${tone === 'warning' ? 'text-amber-600' : ''}`}>
              {value}
            </p>
            <DeltaBadge cur={cur} prev={prev} invert={invert} />
          </div>
        </CardContent>
      </Card>

      <div
        className={`absolute left-0 right-0 top-full z-20 pt-1.5 ${
          pinned ? 'block' : 'hidden group-hover:block'
        }`}
      >
        <div className="max-h-72 overflow-auto rounded-lg border bg-card p-3 text-xs shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}

function EmptyDetail() {
  return <p className="text-muted-foreground">Sem registros no período.</p>;
}

function DetailLeads({ rows }: { rows: AgencyStats['details']['leads'] }) {
  if (rows.length === 0) return <EmptyDetail />;
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center justify-between gap-3">
          <span className="truncate">
            <span className="font-medium">{r.name}</span>
            <span className="text-muted-foreground"> · {r.client}</span>
          </span>
          <span className="shrink-0 text-muted-foreground">
            {SOURCE_LABEL[r.source] ?? r.source} · {fmtTime(r.at)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DetailMissed({ rows }: { rows: AgencyStats['details']['missed'] }) {
  if (rows.length === 0) return <EmptyDetail />;
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center justify-between gap-3">
          <span className="truncate">
            <span className="font-medium">{r.number ?? 'Número oculto'}</span>
            <span className="text-muted-foreground"> · {r.client}</span>
          </span>
          <span className="shrink-0 text-muted-foreground">{fmtTime(r.at)}</span>
        </li>
      ))}
    </ul>
  );
}

function DetailCalls({ calls }: { calls: AgencyStats['details']['calls'] }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 border-b pb-2 font-medium">
        <span className="flex items-center gap-1">
          <ArrowDownLeft className="h-3 w-3 text-emerald-600" /> {calls.inbound} recebidas
        </span>
        <span className="flex items-center gap-1">
          <ArrowUpRight className="h-3 w-3 text-blue-600" /> {calls.outbound} realizadas
        </span>
      </div>
      {calls.recent.length === 0 ? (
        <EmptyDetail />
      ) : (
        <ul className="space-y-1.5">
          {calls.recent.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1">
                {r.direction === 'inbound' ? (
                  <ArrowDownLeft className="h-3 w-3 shrink-0 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-blue-600" />
                )}
                <span className="truncate">
                  <span className="font-medium">{r.number ?? '—'}</span>
                  <span className="text-muted-foreground"> · {r.client}</span>
                </span>
              </span>
              <span className="shrink-0 text-muted-foreground">
                {r.status === 'missed' ? 'perdida' : fmtClock(r.durationSeconds)} · {fmtTime(r.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DetailTalk({ talk }: { talk: AgencyStats['details']['talk'] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Média por chamada</span>
        <span className="font-medium">{fmtClock(talk.avgSeconds)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Chamada mais longa</span>
        <span className="font-medium">
          {talk.longest ? `${fmtClock(talk.longest.seconds)} · ${talk.longest.client}` : '—'}
        </span>
      </div>
    </div>
  );
}
