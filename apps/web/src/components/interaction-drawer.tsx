'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, ExternalLink, Phone, MessageSquare, Voicemail, FormInput } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RecordingPlayer } from '@/components/recording-player';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  won: 'Ganho',
  lost: 'Perdido',
};

interface InteractionDetail {
  id: string;
  type: 'call' | 'sms' | 'voicemail' | 'meta_form';
  direction: 'inbound' | 'outbound';
  status: string;
  startedAt: string;
  durationSeconds: number | null;
  fromNumber: string | null;
  toNumber: string | null;
  smsBody: string | null;
  recordingUrl: string | null;
  transcript: string | null;
  aiSummary: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  aiScore: number | null;
  aiTopics: string[] | null;
  lead: { id: string; name: string | null; phoneE164: string | null; status: LeadStatus } | null;
  agent: { id: string; fullName: string } | null;
  subAccount: { id: string; name: string } | null;
}

const ICONS = {
  call: Phone,
  sms: MessageSquare,
  voicemail: Voicemail,
  meta_form: FormInput,
};

const SENTIMENT_COLOR = {
  positive: 'success' as const,
  neutral: 'secondary' as const,
  negative: 'destructive' as const,
};

export function InteractionDrawer({
  interactionId,
  onClose,
}: {
  interactionId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');

  const { data: interaction } = useQuery<InteractionDetail | null>({
    queryKey: ['interaction-detail', interactionId],
    queryFn: () => apiClient.get(`/interactions/mine/${interactionId}`),
    enabled: !!interactionId,
  });

  const addNote = useMutation({
    mutationFn: (body: string) =>
      apiClient.post(`/leads/${interaction!.lead!.id}/notes`, { body }),
    onSuccess: () => {
      toast.success('Nota salva');
      setNote('');
      qc.invalidateQueries({ queryKey: ['lead', interaction?.lead?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: (status: LeadStatus) =>
      apiClient.patch(`/leads/${interaction!.lead!.id}`, { status }),
    onSuccess: () => {
      toast.success('Status atualizado');
      qc.invalidateQueries({ queryKey: ['interaction-detail', interactionId] });
      qc.invalidateQueries({ queryKey: ['my-calls'] });
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (interactionId) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [interactionId, onClose]);

  if (!interactionId) return null;

  if (!interaction) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/30" onClick={onClose} />
        <div className="w-[520px] bg-background p-6">Carregando...</div>
      </div>
    );
  }

  const Icon = ICONS[interaction.type];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="flex w-[540px] flex-col overflow-auto bg-background">
        <div className="sticky top-0 flex items-center justify-between border-b bg-background p-4">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                {interaction.type === 'call'
                  ? `Chamada ${interaction.direction === 'inbound' ? 'recebida' : 'realizada'}`
                  : interaction.type === 'sms'
                    ? `SMS ${interaction.direction === 'inbound' ? 'recebido' : 'enviado'}`
                    : interaction.type === 'voicemail'
                      ? 'Voicemail'
                      : 'Formulário'}
              </p>
              <p className="font-mono text-sm">
                {interaction.direction === 'inbound' ? interaction.fromNumber : interaction.toNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(interaction.startedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2">
            <InfoBox label="Cliente" value={interaction.subAccount?.name ?? '—'} />
            <InfoBox label="Atendente" value={interaction.agent?.fullName ?? '—'} />
            <InfoBox
              label="Duração"
              value={interaction.durationSeconds ? formatDuration(interaction.durationSeconds) : '—'}
            />
            <InfoBox label="Status" value={interaction.status} />
          </div>

          {interaction.recordingUrl && (
            <section>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Gravação</p>
              <RecordingPlayer interactionId={interaction.id} />
            </section>
          )}

          {interaction.smsBody && (
            <section>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Mensagem</p>
              <p className="rounded-md border bg-muted/30 p-3 text-sm">{interaction.smsBody}</p>
            </section>
          )}

          {(interaction.aiSummary || interaction.sentiment || interaction.aiScore) && (
            <section className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="mb-2 text-xs font-medium uppercase text-blue-700">Análise IA</p>
              {interaction.aiSummary && <p className="text-sm">{interaction.aiSummary}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {interaction.sentiment && (
                  <Badge variant={SENTIMENT_COLOR[interaction.sentiment]}>
                    {interaction.sentiment}
                  </Badge>
                )}
                {interaction.aiScore !== null && (
                  <Badge variant="outline">Score: {interaction.aiScore}/100</Badge>
                )}
                {interaction.aiTopics?.map((t) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
            </section>
          )}

          {interaction.transcript && (
            <section>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Transcrição</p>
              <div className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                {interaction.transcript}
              </div>
            </section>
          )}

          {interaction.lead && (
            <>
              <section className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Lead</p>
                    <p className="font-medium">{interaction.lead.name ?? interaction.lead.phoneE164}</p>
                  </div>
                  <select
                    value={interaction.lead.status}
                    onChange={(e) => updateStatus.mutate(e.target.value as LeadStatus)}
                    className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <Link
                  href={`/workspace/leads/${interaction.lead.id}` as never}
                  className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" /> Abrir lead completo
                </Link>
              </section>

              <section>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Observação sobre essa chamada
                </p>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Resumo do que foi dito, objeções, próximos passos..."
                  rows={4}
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => addNote.mutate(note)}
                  disabled={!note.trim() || addNote.isPending}
                >
                  <Save className="h-4 w-4" /> Salvar observação
                </Button>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
