'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';
import { Badge } from '@/components/ui/badge';
import { RecordingPlayer } from '@/components/recording-player';
import { useTranslate } from '@/i18n/provider';

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
  const { t } = useTranslate();
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const { data: calls = [], isLoading } = useQuery<CallInteraction[]>({
    queryKey: ['client-calls', subAccountId],
    queryFn: () => apiClient.get<CallInteraction[]>('/interactions?type=call'),
    enabled: !!subAccountId,
  });

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{t('clientCalls.title')}</h1>
        <p className="mt-1 text-muted-foreground">{calls.length} {t('clientCalls.callsCount')}</p>
      </header>

      {isLoading && <p className="text-muted-foreground">{t('clientCalls.loading')}</p>}
      {!isLoading && calls.length === 0 && <p className="text-muted-foreground">{t('clientCalls.empty')}</p>}

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
            <div key={c.id} className="flex items-center gap-4 rounded-md border p-3">
              <Link
                href={`/client/calls/${c.id}` as never}
                className="flex flex-1 items-center gap-4 hover:opacity-80"
              >
                <Icon className={`h-5 w-5 ${color}`} />
                <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t('clientCalls.number')}</p>
                  <p className="font-mono text-sm">{number ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('clientCalls.lead')}</p>
                  <p className="text-sm">{c.lead?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('clientCalls.duration')}</p>
                  <p className="text-sm">{c.durationSeconds ? formatDuration(c.durationSeconds) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('clientCalls.when')}</p>
                  <p className="text-xs">{new Date(c.startedAt).toLocaleString('pt-BR')}</p>
                </div>
                </div>
              </Link>
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
