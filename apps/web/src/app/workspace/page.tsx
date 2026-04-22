'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Users,
  Clock,
  TrendingUp,
  Snowflake,
  Repeat,
  Trophy,
  FileDown,
  Timer,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { MiniLineChart } from '@/components/line-chart';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';

interface DashboardStats {
  leadsToday: number;
  callsToday: number;
  missedCalls: number;
  avgHandleTime: number;
  avgWaitingTime: number;
  totalTalkToday: number;
  callsWeek: number;
  inboundWeek: number;
  outboundWeek: number;
  coldCallsWeek: number;
  followupCallsWeek: number;
  leadsWeek: number;
  wonWeek: number;
  qualifiedWeek: number;
  lostWeek: number;
  conversionRateQualified: number;
  conversionRateWon: number;
  winRate: number;
  series: Array<{ day: string; count: number }>;
  hourlySeries: Array<{ hour: number; count: number }>;
  topAgents: Array<{ userId: string; name: string; calls: number; talkTime: number }>;
  statusBreakdown: Array<{ status: string; count: number; percent: number }>;
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Novos',
  contacted: 'Contatados',
  qualified: 'Qualificados',
  won: 'Ganhos',
  lost: 'Perdidos',
};

const STATUS_COLOR: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-purple-500',
  qualified: 'bg-amber-500',
  won: 'bg-emerald-500',
  lost: 'bg-red-500',
};

export default function WorkspaceDashboard() {
  const token = useAuthStore((s) => s.accessToken);
  const subAccountId = useTenantStore((s) => s.subAccountId);

  const { data } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.get<DashboardStats>('/dashboard/stats'),
    refetchInterval: 60_000,
  });

  function downloadMonthlyReport() {
    if (!token || !subAccountId) return;
    const now = new Date();
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/reports/monthly.pdf?year=${now.getFullYear()}&month=${now.getMonth() + 1}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'X-Sub-Account-Id': subAccountId },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `relatorio-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
        a.click();
      });
  }

  const s = data ?? {
    leadsToday: 0, callsToday: 0, missedCalls: 0, avgHandleTime: 0, avgWaitingTime: 0,
    totalTalkToday: 0, callsWeek: 0, inboundWeek: 0, outboundWeek: 0,
    coldCallsWeek: 0, followupCallsWeek: 0, leadsWeek: 0, wonWeek: 0,
    qualifiedWeek: 0, lostWeek: 0, conversionRateQualified: 0, conversionRateWon: 0,
    winRate: 0, series: [], hourlySeries: [], topAgents: [], statusBreakdown: [],
  };

  const peakHour = s.hourlySeries.reduce(
    (acc, h) => (h.count > acc.count ? h : acc),
    { hour: 0, count: 0 },
  );

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Visão geral do cliente</p>
        </div>
        <Button variant="outline" onClick={downloadMonthlyReport}>
          <FileDown className="h-4 w-4" /> Relatório do mês
        </Button>
      </div>

      <h2 className="mt-6 mb-3 text-xs font-semibold uppercase text-muted-foreground">Hoje</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KPI title="Leads hoje" value={s.leadsToday} icon={Users} />
        <KPI title="Chamadas hoje" value={s.callsToday} icon={Phone} />
        <KPI title="Perdidas" value={s.missedCalls} icon={PhoneMissed} tone="warning" />
        <KPI title="TMA" value={formatDuration(s.avgHandleTime)} icon={Clock} hint="Tempo médio" />
        <KPI title="T. espera" value={formatDuration(s.avgWaitingTime)} icon={Timer} hint="Cliente esperou" />
      </div>

      <h2 className="mt-6 mb-3 text-xs font-semibold uppercase text-muted-foreground">Últimos 7 dias</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI title="Chamadas (7d)" value={s.callsWeek} icon={Phone} />
        <KPI title="Recebidas" value={s.inboundWeek} icon={PhoneIncoming} />
        <KPI title="Realizadas" value={s.outboundWeek} icon={PhoneOutgoing} />
        <KPI title="Leads (7d)" value={s.leadsWeek} icon={Users} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI title="Chamadas frias" value={s.coldCallsWeek} icon={Snowflake} hint="Lead novo" />
        <KPI title="Follow-ups" value={s.followupCallsWeek} icon={Repeat} hint="Lead já contatado" />
        <KPI title="Qualificação" value={`${s.conversionRateQualified}%`} icon={TrendingUp} hint="Leads que qualificaram" />
        <KPI title="Win rate" value={`${s.winRate}%`} icon={Trophy} hint="Qualificados ganhos" tone={s.winRate > 20 ? 'success' : undefined} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Volume por dia (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniLineChart data={s.series} height={140} color="#3b82f6" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horários de pico</CardTitle>
            {peakHour.count > 0 && (
              <p className="text-xs text-muted-foreground">
                Pico: {String(peakHour.hour).padStart(2, '0')}:00 — {peakHour.count} chamadas
              </p>
            )}
          </CardHeader>
          <CardContent>
            <HourlyBars data={s.hourlySeries} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Funil de leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.statusBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem leads ainda.</p>
            )}
            {s.statusBreakdown.map((b) => (
              <div key={b.status}>
                <div className="flex items-center justify-between text-sm">
                  <span>{STATUS_LABEL[b.status] ?? b.status}</span>
                  <span className="text-muted-foreground">{b.count} ({b.percent}%)</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${STATUS_COLOR[b.status] ?? 'bg-primary'}`}
                    style={{ width: `${b.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top atendentes (7d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.topAgents.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            )}
            {s.topAgents.map((a) => (
              <div key={a.userId} className="flex items-center justify-between rounded-md border p-3">
                <span className="text-sm font-medium">{a.name}</span>
                <div className="text-right">
                  <p className="text-sm">{a.calls} chamadas</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(a.talkTime)} falados</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HourlyBars({ data }: { data: Array<{ hour: number; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-[140px]">
      {data.map((d) => (
        <div
          key={d.hour}
          className="flex-1 flex flex-col items-center justify-end gap-1"
          title={`${String(d.hour).padStart(2, '0')}:00 — ${d.count}`}
        >
          <div
            className="w-full rounded-t bg-blue-500"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '2px' : '0' }}
          />
          {d.hour % 3 === 0 && (
            <span className="text-[9px] text-muted-foreground">{String(d.hour).padStart(2, '0')}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function KPI({
  title,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'warning' | 'success';
  hint?: string;
}) {
  const color = tone === 'warning' ? 'text-amber-600' : tone === 'success' ? 'text-emerald-600' : '';
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
  return `${s}s`;
}
