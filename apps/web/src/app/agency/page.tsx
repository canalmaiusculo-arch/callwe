'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Phone, PhoneMissed, TrendingUp, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MiniLineChart } from '@/components/line-chart';
import { useAdminViewStore } from '@/stores/admin-view-store';

interface AgencyStats {
  totalClients: number;
  totalLeadsToday: number;
  totalCallsToday: number;
  totalMissedToday: number;
  totalLeadsWeek: number;
  totalCallsWeek: number;
  totalTalkTodaySeconds: number;
  topClients: Array<{ subAccountId: string; name: string; calls: number }>;
  series: Array<{ day: string; count: number }>;
}

export default function AgencyDashboard() {
  const viewAsAgencyId = useAdminViewStore((s) => s.viewAsAgencyId);
  const { data } = useQuery<AgencyStats>({
    queryKey: ['agency-stats', viewAsAgencyId],
    queryFn: () =>
      apiClient.get<AgencyStats>(
        viewAsAgencyId ? `/dashboard/agency-stats?agencyId=${viewAsAgencyId}` : '/dashboard/agency-stats',
      ),
    refetchInterval: 60_000,
  });

  const s = data ?? {
    totalClients: 0,
    totalLeadsToday: 0,
    totalCallsToday: 0,
    totalMissedToday: 0,
    totalLeadsWeek: 0,
    totalCallsWeek: 0,
    totalTalkTodaySeconds: 0,
    topClients: [],
    series: [],
  };

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Visão geral da agência</h1>
        <p className="mt-1 text-muted-foreground">{s.totalClients} clientes ativos</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI title="Leads hoje" value={s.totalLeadsToday} icon={Users} />
        <KPI title="Chamadas hoje" value={s.totalCallsToday} icon={Phone} />
        <KPI title="Perdidas hoje" value={s.totalMissedToday} icon={PhoneMissed} tone="warning" />
        <KPI title="Tempo ao telefone" value={formatDuration(s.totalTalkTodaySeconds)} icon={Clock} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPI title="Leads (7d)" value={s.totalLeadsWeek} icon={TrendingUp} />
        <KPI title="Chamadas (7d)" value={s.totalCallsWeek} icon={TrendingUp} />
        <KPI title="Total clientes" value={s.totalClients} icon={Building2} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chamadas — últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniLineChart data={s.series} height={140} color="#10b981" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes com mais chamadas (7d)</CardTitle>
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
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'warning';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
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
