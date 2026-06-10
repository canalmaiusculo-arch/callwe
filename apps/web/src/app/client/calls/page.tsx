'use client';

import { useQuery } from '@tanstack/react-query';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';
import { Badge } from '@/components/ui/badge';
import { RecordingPlayer } from '@/components/recording-player';

interface CallInteraction {
  id: string;
  direction: 'inbound' | 'outbound';
  status: string;
  startedAt: string;
  durationSeconds: number | null;
  fromNumber: string | null;
  toNumber: string | null;
  recordingUrl: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  lead: { id: string; name: string | null } | null;
}

const SENTIMENT_VARIANT = {
  positive: 'success' as const,
  neutral: 'secondary' as const,
  negative: 'destructive' as const,
};

export default function ClientCallsPage() {
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const { data: calls = [], isLoading } = useQuery<CallInteraction[]>({
    queryKey: ['client-calls', subAccountId],
    queryFn: () => apiClient.get<CallInteraction[]>('/interactions?type=call'),
    enabled: !!subAccountId,
  });

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Minhas chamadas</h1>
        <p className="mt-1 text-muted-foreground">{calls.length} chamadas</p>
      </header>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {!isLoading && calls.length === 0 && <p className="text-muted-foreground">Nenhuma chamada ainda.</p>}

      <div className="space-y-2">
        {calls.map((c) => {
          const Icon =
            c.status === 'missed' ? PhoneMissed : c.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
          const color =
            c.status === 'missed'
              ? 'text-red-600'
              : c.direction === 'inbound'
                ? 'text-emerald-600'
                : 'text-blue-600';
          const number = c.direction === 'inbound' ? c.fromNumber : c.toNumber;
          return (
            <div key={c.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-md border p-3">
              <Icon className={`h-5 w-5 ${color}`} />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Número</p>
                  <p className="font-mono text-sm">{number ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lead</p>
                  <p className="text-sm">{c.lead?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duração</p>
                  <p className="text-sm">{c.durationSeconds ? formatDuration(c.durationSeconds) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quando</p>
                  <p className="text-xs">{new Date(c.startedAt).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.sentiment && <Badge variant={SENTIMENT_VARIANT[c.sentiment]}>{c.sentiment}</Badge>}
                {c.recordingUrl && <RecordingPlayer interactionId={c.id} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
