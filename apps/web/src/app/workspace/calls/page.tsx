'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';
import { Badge } from '@/components/ui/badge';
import { RecordingPlayer } from '@/components/recording-player';
import { useTranslate } from '@/i18n/provider';

interface CallInteraction {
  id: string;
  type: 'call';
  direction: 'inbound' | 'outbound';
  status: string;
  startedAt: string;
  durationSeconds: number | null;
  fromNumber: string | null;
  toNumber: string | null;
  recordingUrl: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  aiSummary: string | null;
  lead: { id: string; name: string | null } | null;
  agent: { id: string; fullName: string } | null;
}

const SENTIMENT_VARIANT = {
  positive: 'success' as const,
  neutral: 'secondary' as const,
  negative: 'destructive' as const,
};

export default function CallsPage() {
  const { t } = useTranslate();
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const { data: calls = [], isLoading } = useQuery<CallInteraction[]>({
    queryKey: ['calls', subAccountId],
    queryFn: () => apiClient.get<CallInteraction[]>('/interactions?type=call'),
    enabled: !!subAccountId,
  });

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">{t('wsCalls.title')}</h1>
        <p className="mt-1 text-muted-foreground">{calls.length} {t('wsCalls.callsCount')}</p>
      </header>

      {isLoading && <p className="text-muted-foreground">{t('wsCalls.loading')}</p>}

      <div className="space-y-2">
        {calls.map((c) => (
          <CallRow key={c.id} call={c} />
        ))}
      </div>
    </div>
  );
}

function CallRow({ call }: { call: CallInteraction }) {
  const { t } = useTranslate();
  const Icon = call.status === 'missed' ? PhoneMissed : call.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
  const iconColor =
    call.status === 'missed'
      ? 'text-red-600'
      : call.direction === 'inbound'
        ? 'text-emerald-600'
        : 'text-blue-600';

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-md border p-3">
      <Icon className={`h-5 w-5 ${iconColor}`} />
      <div className="grid grid-cols-5 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{t('wsCalls.from')}</p>
          <p className="font-mono text-sm">{call.fromNumber ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('wsCalls.lead')}</p>
          {call.lead ? (
            <Link href={`/workspace/leads/${call.lead.id}` as never} className="text-sm hover:underline">
              {call.lead.name ?? '—'}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('wsCalls.agent')}</p>
          <p className="text-sm">{call.agent?.fullName ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('wsCalls.duration')}</p>
          <p className="text-sm">{call.durationSeconds ? formatDuration(call.durationSeconds) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('wsCalls.when')}</p>
          <p className="text-xs">{new Date(call.startedAt).toLocaleString('pt-BR')}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {call.sentiment && <Badge variant={SENTIMENT_VARIANT[call.sentiment]}>{call.sentiment}</Badge>}
        {call.recordingUrl && <RecordingPlayer interactionId={call.id} />}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
