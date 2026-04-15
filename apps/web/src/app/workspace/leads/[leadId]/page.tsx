'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, MessageSquare, Voicemail, FormInput } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Interaction {
  id: string;
  type: 'call' | 'sms' | 'voicemail' | 'meta_form';
  direction: 'inbound' | 'outbound';
  status: string;
  startedAt: string;
  durationSeconds: number | null;
  recordingUrl: string | null;
  smsBody: string | null;
  aiSummary: string | null;
  agent: { id: string; fullName: string } | null;
}

interface LeadDetail {
  id: string;
  name: string | null;
  phoneE164: string | null;
  email: string | null;
  status: string;
  source: string;
  createdAt: string;
  interactions: Interaction[];
  notes: Array<{ id: string; body: string; createdAt: string; authorUserId: string }>;
}

const ICONS = {
  call: Phone,
  sms: MessageSquare,
  voicemail: Voicemail,
  meta_form: FormInput,
};

export default function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = use(params);

  const { data: lead, isLoading } = useQuery<LeadDetail>({
    queryKey: ['lead', leadId],
    queryFn: () => apiClient.get<LeadDetail>(`/leads/${leadId}`),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!lead) return <div className="p-8">Lead não encontrado.</div>;

  return (
    <div className="grid h-screen grid-cols-12 gap-4 p-8">
      <section className="col-span-8 space-y-4 overflow-auto">
        <header>
          <Link href="/workspace/leads" className="text-sm text-muted-foreground hover:underline">
            ← Leads
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{lead.name ?? lead.phoneE164 ?? '—'}</h1>
          <div className="mt-2 flex gap-2 text-sm text-muted-foreground">
            <span>{lead.phoneE164}</span>
            {lead.email && <span>· {lead.email}</span>}
            <Badge>{lead.status}</Badge>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.interactions.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem interações ainda.</p>
            )}
            {lead.interactions.map((i) => (
              <InteractionRow key={i.id} interaction={i} />
            ))}
          </CardContent>
        </Card>
      </section>

      <aside className="col-span-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lead.notes.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem notas.</p>
            )}
            {lead.notes.map((n) => (
              <div key={n.id} className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString('pt-BR')}
                </p>
                <p className="mt-1 text-sm">{n.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function InteractionRow({ interaction }: { interaction: Interaction }) {
  const Icon = ICONS[interaction.type];
  return (
    <div className="flex gap-3 rounded-md border p-3">
      <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {interaction.type === 'call'
              ? `Chamada ${interaction.direction === 'inbound' ? 'recebida' : 'realizada'}`
              : interaction.type === 'sms'
                ? `SMS ${interaction.direction === 'inbound' ? 'recebido' : 'enviado'}`
                : interaction.type === 'voicemail'
                  ? 'Voicemail'
                  : 'Formulário Meta'}
          </p>
          <span className="text-xs text-muted-foreground">
            {new Date(interaction.startedAt).toLocaleString('pt-BR')}
          </span>
        </div>
        {interaction.durationSeconds !== null && (
          <p className="text-xs text-muted-foreground">
            Duração: {formatDuration(interaction.durationSeconds)}
          </p>
        )}
        {interaction.agent && (
          <p className="text-xs text-muted-foreground">Atendente: {interaction.agent.fullName}</p>
        )}
        {interaction.smsBody && <p className="mt-2 text-sm">{interaction.smsBody}</p>}
        {interaction.aiSummary && (
          <p className="mt-2 rounded bg-muted/40 p-2 text-xs italic">{interaction.aiSummary}</p>
        )}
        {interaction.recordingUrl && (
          <audio controls className="mt-2 w-full" src={interaction.recordingUrl} />
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
