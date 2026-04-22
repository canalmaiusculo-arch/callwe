'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, PhoneMissed, Users, Clock, TrendingUp } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { MiniLineChart } from '@/components/line-chart';

interface DashboardStats {
  leadsToday: number;
  callsToday: number;
  missedCalls: number;
  avgHandleTime: number;
  totalTalkToday: number;
  callsWeek: number;
  leadsWeek: number;
  wonWeek: number;
  conversionRate: number;
  series: Array<{ day: string; count: number }>;
  topAgents: Array<{ userId: string; name: string; calls: number; talkTime: number }>;
}

export default function WorkspaceDashboard() {
  const { data } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.get<DashboardStats>('/dashboard/stats'),
    refetchInterval: 60_000,
  });

  const s = data ?? {
    leadsToday: 0,
    callsToday: 0,
    missedCalls: 0,
    avgHandleTime: 0,
    totalTalkToday: 0,
    callsWeek: 0,
    leadsWeek: 0,
    wonWeek: 0,
    conversionRate: 0,
    series: [],
    topAgents: [],
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Visão geral do cliente</p>

      <div className="mt-6 grid grid-cols-4 gap-3">
        <KPI title="Leads hoje" value={s.leadsToday} icon={Users} />
        <KPI title="Chamadas hoje" value={s.callsToday} icon={Phone} />
        <KPI title="Perdidas hoje" value={s.missedCalls} icon={PhoneMissed} tone="warning" />
        <KPI title="TMA (hoje)" value={formatDuration(s.avgHandleTime)} icon={Clock} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <KPI title="Chamadas (7d)" value={s.callsWeek} icon={TrendingUp} />
        <KPI title="Leads (7d)" value={s.leadsWeek} icon={TrendingUp} />
        <KPI title="Conversão (7d)" value={`${s.conversionRate}%`} icon={TrendingUp} tone={s.conversionRate > 0 ? 'success' : undefined} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Chamadas — últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniLineChart data={s.series} height={140} color="#3b82f6" />
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

function KPI({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'warning' | 'success';
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
