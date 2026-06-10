'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecordingPlayer } from '@/components/recording-player';
import { useTenantStore } from '@/stores/tenant-store';

interface InteractionDetail {
  id: string;
  type: string;
  direction: string;
  status: string;
  startedAt: string;
  durationSeconds: number | null;
  waitingSeconds: number | null;
  fromNumber: string | null;
  toNumber: string | null;
  recordingUrl: string | null;
  transcript: string | null;
  aiSummary: string | null;
  sentiment: string | null;
  aiScore: number | null;
  aiTopics: string[];
  lead: { id: string; name: string | null } | null;
  agent: { id: string; fullName: string } | null;
}

const SENTIMENT: Record<string, { label: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  positive: { label: 'positivo', variant: 'success' },
  neutral: { label: 'neutro', variant: 'secondary' },
  negative: { label: 'negativo', variant: 'destructive' },
};

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ClientCallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const subAccountId = useTenantStore((s) => s.subAccountId);

  const { data: c, isLoading } = useQuery<InteractionDetail>({
    queryKey: ['client-call', id, subAccountId],
    queryFn: () => apiClient.get(`/interactions/${id}`),
    enabled: !!subAccountId,
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!c) return <div className="p-8">Chamada não encontrada.</div>;

  const Icon = c.status === 'missed' ? PhoneMissed : c.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
  const number = c.direction === 'inbound' ? c.fromNumber : c.toNumber;

  return (
    <div className="p-4 md:p-8">
      <Link href={'/client/calls' as never} className="text-sm text-muted-foreground hover:underline">
        ← Chamadas
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <Icon className="h-7 w-7 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">
            {c.direction === 'inbound' ? 'Chamada recebida' : 'Chamada realizada'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {number ?? '—'} · {new Date(c.startedAt).toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Info label="Status" value={c.status} />
        <Info label="Duração" value={c.durationSeconds != null ? fmtDur(c.durationSeconds) : '—'} />
        <Info label="Espera" value={c.waitingSeconds != null ? fmtDur(c.waitingSeconds) : '—'} />
        <Info
          label="Lead"
          value={
            c.lead ? (
              <Link href={`/client/leads/${c.lead.id}` as never} className="text-primary hover:underline">
                {c.lead.name ?? 'ver lead'}
              </Link>
            ) : (
              '—'
            )
          }
        />
      </div>

      {c.recordingUrl && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Gravação</CardTitle></CardHeader>
          <CardContent><RecordingPlayer interactionId={c.id} /></CardContent>
        </Card>
      )}

      {(c.aiSummary || c.sentiment || c.aiScore != null || c.aiTopics.length > 0) && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-secondary" /> Análise por IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {c.aiScore != null && <Badge variant="outline">nota {c.aiScore}</Badge>}
              {c.sentiment && SENTIMENT[c.sentiment] && (
                <Badge variant={SENTIMENT[c.sentiment]!.variant}>{SENTIMENT[c.sentiment]!.label}</Badge>
              )}
              {c.aiTopics.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
            {c.aiSummary && <p className="text-sm">{c.aiSummary}</p>}
          </CardContent>
        </Card>
      )}

      {c.transcript && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Transcrição</CardTitle></CardHeader>
          <CardContent>
            <p className="max-h-96 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">
              {c.transcript}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
