'use client';

import { use, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, MessageSquare, Voicemail, FormInput, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  won: 'Ganho',
  lost: 'Perdido',
};

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
  status: LeadStatus;
  source: string;
  lostReason: string | null;
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
  const qc = useQueryClient();
  const [newNote, setNewNote] = useState('');

  const { data: lead, isLoading } = useQuery<LeadDetail>({
    queryKey: ['lead', leadId],
    queryFn: () => apiClient.get<LeadDetail>(`/leads/${leadId}`),
  });

  const update = useMutation({
    mutationFn: (input: Partial<LeadDetail>) => apiClient.patch(`/leads/${leadId}`, input),
    onSuccess: () => {
      toast.success('Lead atualizado');
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addNote = useMutation({
    mutationFn: (body: string) => apiClient.post(`/leads/${leadId}/notes`, { body }),
    onSuccess: () => {
      setNewNote('');
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
      toast.success('Nota adicionada');
    },
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!lead) return <div className="p-8">Lead não encontrado.</div>;

  return (
    <div className="grid h-screen grid-cols-12 gap-4 overflow-auto p-8">
      <section className="col-span-8 space-y-4">
        <header>
          <Link href={'/workspace/leads' as never} className="text-sm text-muted-foreground hover:underline">
            ← Leads
          </Link>
          <div className="mt-2 flex items-start justify-between">
            <div>
              <Input
                value={lead.name ?? ''}
                onChange={(e) => update.mutate({ name: e.target.value })}
                placeholder="Sem nome — clique para editar"
                className="border-0 px-0 text-3xl font-bold shadow-none focus-visible:ring-0"
              />
              <div className="mt-2 flex gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{lead.phoneE164}</span>
                {lead.email && <span>· {lead.email}</span>}
              </div>
            </div>
            <select
              value={lead.status}
              onChange={(e) => update.mutate({ status: e.target.value as LeadStatus })}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Timeline ({lead.interactions.length})</CardTitle>
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
            <CardTitle>Adicionar nota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Resumo da chamada, próximos passos..."
              rows={4}
            />
            <Button
              size="sm"
              onClick={() => addNote.mutate(newNote)}
              disabled={!newNote.trim() || addNote.isPending}
            >
              <Save className="h-4 w-4" /> Salvar nota
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notas ({lead.notes.length})</CardTitle>
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
                <p className="mt-1 text-sm whitespace-pre-wrap">{n.body}</p>
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
        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
          {interaction.durationSeconds !== null && (
            <span>Duração: {formatDuration(interaction.durationSeconds)}</span>
          )}
          {interaction.agent && <span>Atendente: {interaction.agent.fullName}</span>}
          <Badge variant="secondary" className="text-xs">{interaction.status}</Badge>
        </div>
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
