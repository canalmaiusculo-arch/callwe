'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Users, Phone, PhoneMissed, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MiniLineChart } from '@/components/line-chart';
import { useAdminViewStore } from '@/stores/admin-view-store';

type Period = 'today' | '7d' | '30d';

interface AgencyStats {
  period: Period;
  totalClients: number;
  leads: number;
  calls: number;
  missed: number;
  talkSeconds: number;
  topClients: Array<{ subAccountId: string; name: string; calls: number }>;
  series: Array<{ day: string; count: number }>;
  clients: Array<{ id: string; name: string }>;
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
};

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
    topClients: [],
    series: [],
    clients: [],
  };

  const periodLabel = PERIOD_LABELS[period].toLowerCase();

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
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI title="Leads" sub={periodLabel} value={s.leads} icon={Users} />
        <KPI title="Chamadas" sub={periodLabel} value={s.calls} icon={Phone} />
        <KPI title="Perdidas" sub={periodLabel} value={s.missed} icon={PhoneMissed} tone="warning" />
        <KPI
          title="Tempo ao telefone"
          sub={periodLabel}
          value={formatDuration(s.talkSeconds)}
          icon={Clock}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chamadas — {periodLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniLineChart data={s.series} height={140} color="#10b981" />
          </CardContent>
        </Card>

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

function KPI({
  title,
  sub,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  sub?: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'warning';
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

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
