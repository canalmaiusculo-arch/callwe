'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Users, Clock, PhoneMissed } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MiniLineChart } from '@/components/line-chart';
import { useTenantStore } from '@/stores/tenant-store';
import { useAuthStore } from '@/stores/auth-store';

interface DashboardStats {
  leadsToday: number;
  callsToday: number;
  missedCalls: number;
  avgHandleTime: number;
  callsWeek: number;
  leadsWeek: number;
  conversionRateWon: number;
  series: Array<{ day: string; count: number }>;
}

export default function ClientDashboard() {
  const { setTenant, subAccountId } = useTenantStore();

  // Se o cliente ainda não tem tenant selecionado, pega a primeira subconta dele
  const { data: mySubs } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['my-sub-accounts'],
    queryFn: () => apiClient.get('/sub-accounts/mine'),
  });

  useEffect(() => {
    if (!subAccountId && mySubs && mySubs.length > 0) {
      setTenant(mySubs[0]!.id, mySubs[0]!.name);
    }
  }, [mySubs, subAccountId, setTenant]);

  const { data } = useQuery<DashboardStats>({
    queryKey: ['client-dashboard-stats'],
    queryFn: () => apiClient.get('/dashboard/stats'),
    enabled: !!subAccountId,
    refetchInterval: 60_000,
  });

  const s = data ?? {
    leadsToday: 0, callsToday: 0, missedCalls: 0, avgHandleTime: 0,
    callsWeek: 0, leadsWeek: 0, conversionRateWon: 0, series: [],
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold">Meu painel</h1>
      <p className="mt-1 text-muted-foreground">Visão de hoje e últimos 7 dias</p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI title="Leads hoje" value={s.leadsToday} icon={Users} />
        <KPI title="Chamadas hoje" value={s.callsToday} icon={Phone} />
        <KPI title="Perdidas hoje" value={s.missedCalls} icon={PhoneMissed} tone="warning" />
        <KPI title="TMA" value={formatDuration(s.avgHandleTime)} icon={Clock} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <KPI title="Chamadas (7d)" value={s.callsWeek} icon={Phone} />
        <KPI title="Leads (7d)" value={s.leadsWeek} icon={Users} />
        <KPI title="Conversão" value={`${s.conversionRateWon ?? 0}%`} icon={Users} />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Volume — últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniLineChart data={s.series} height={140} color="#3b82f6" />
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
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
