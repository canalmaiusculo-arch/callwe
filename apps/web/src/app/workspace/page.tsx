'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';

interface DashboardStats {
  leadsToday: number;
  callsToday: number;
  missedCalls: number;
  avgHandleTime: number;
}

export default function WorkspaceDashboard() {
  const { data } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.get('/dashboard/stats'),
    // placeholder — endpoint ainda não existe
    enabled: false,
  });

  const stats: DashboardStats = data ?? {
    leadsToday: 0,
    callsToday: 0,
    missedCalls: 0,
    avgHandleTime: 0,
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Visão geral de hoje.</p>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatCard title="Leads hoje" value={stats.leadsToday} />
        <StatCard title="Chamadas hoje" value={stats.callsToday} />
        <StatCard title="Perdidas" value={stats.missedCalls} tone="warning" />
        <StatCard title="TMA (seg)" value={stats.avgHandleTime} />
      </div>
    </div>
  );
}

function StatCard({ title, value, tone }: { title: string; value: number; tone?: 'warning' }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${tone === 'warning' ? 'text-amber-600' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
