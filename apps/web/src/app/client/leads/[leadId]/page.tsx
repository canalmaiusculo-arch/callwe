'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, MessageSquare, Voicemail, FormInput, Send } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RecordingPlayer } from '@/components/recording-player';
import { useTenantStore } from '@/stores/tenant-store';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

const STATUS_LABEL: Record<string, string> = {
  new: 'Novo', contacted: 'Contatado', qualified: 'Qualificado', won: 'Ganho', lost: 'Perdido',
};
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  new: 'default', contacted: 'secondary', qualified: 'warning', won: 'success', lost: 'destructive',
};
const SOURCE_LABEL: Record<string, string> = {
  inbound_call: 'Chamada entrante', outbound_call: 'Chamada saída', meta_ads: 'Meta Ads',
  sms: 'SMS', manual: 'Manual', import: 'Importação', api: 'API', form: 'Formulário',
};
const ROLE_LABEL: Record<string, string> = {
  client_viewer: 'Cliente', agent: 'Atendente', sub_account_admin: 'Atendente',
  agency_admin: 'Agência', super_admin: 'Agência',
};
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone, sms: MessageSquare, voicemail: Voicemail, meta_form: FormInput,
};
// Campos internos que não fazem sentido mostrar ao cliente.
const HIDDEN_FIELDS = new Set(['acquisitionchannel', 'receivedvia', 'zapierapikey']);

interface Interaction {
  id: string;
  type: string;
  direction: string;
  status: string;
  startedAt: string;
  durationSeconds: number | null;
  recordingUrl: string | null;
  smsBody: string | null;
  aiSummary: string | null;
}
interface Note {
  id: string;
  body: string;
  createdAt: string;
  authorRole: string | null;
  author: { id: string; fullName: string } | null;
}
interface LeadDetail {
  id: string;
  name: string | null;
  phoneE164: string | null;
  email: string | null;
  status: LeadStatus;
  source: string;
  tags: string[];
  customFields: Record<string, unknown> | null;
  createdAt: string;
  interactions: Interaction[];
  notes: Note[];
}

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ClientLeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = use(params);
  const qc = useQueryClient();
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const [msg, setMsg] = useState('');

  const { data: lead, isLoading } = useQuery<LeadDetail>({
    queryKey: ['client-lead', leadId, subAccountId],
    queryFn: () => apiClient.get(`/leads/${leadId}`),
    enabled: !!subAccountId,
  });

  const send = useMutation({
    mutationFn: (body: string) => apiClient.post(`/leads/${leadId}/notes`, { body }),
    onSuccess: () => {
      setMsg('');
      qc.invalidateQueries({ queryKey: ['client-lead', leadId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!lead) return <div className="p-8">Lead não encontrado.</div>;

  const fields = Object.entries(lead.customFields ?? {}).filter(
    ([k, v]) => !HIDDEN_FIELDS.has(k.toLowerCase()) && v != null && typeof v !== 'object',
  );

  return (
    <div className="p-4 md:p-8">
      <Link href={'/client/leads' as never} className="text-sm text-muted-foreground hover:underline">
        ← Leads
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{lead.name ?? 'Lead sem nome'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {lead.phoneE164 && <span className="font-mono">{lead.phoneE164}</span>}
            {lead.email && <span>· {lead.email}</span>}
            <span>· {SOURCE_LABEL[lead.source] ?? lead.source}</span>
            <span>· {new Date(lead.createdAt).toLocaleString('pt-BR')}</span>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[lead.status]}>{STATUS_LABEL[lead.status] ?? lead.status}</Badge>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-4 lg:col-span-2">
          {(fields.length > 0 || lead.tags.length > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Informações do lead</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lead.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                  </div>
                )}
                {fields.length > 0 && (
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    {fields.map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <dt className="text-xs uppercase text-muted-foreground">{k}</dt>
                        <dd className="text-sm">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Histórico ({lead.interactions.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lead.interactions.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem interações ainda.</p>
              )}
              {lead.interactions.map((i) => {
                const Icon = ICONS[i.type] ?? Phone;
                return (
                  <div key={i.id} className="flex gap-3 rounded-md border p-3">
                    <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {i.type === 'call'
                            ? `Chamada ${i.direction === 'inbound' ? 'recebida' : 'realizada'}`
                            : i.type === 'sms'
                              ? `SMS ${i.direction === 'inbound' ? 'recebido' : 'enviado'}`
                              : i.type === 'voicemail'
                                ? 'Voicemail'
                                : 'Formulário'}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(i.startedAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {i.durationSeconds != null && <span>Duração: {fmtDur(i.durationSeconds)}</span>}
                        <Badge variant="secondary" className="text-xs">{i.status}</Badge>
                      </div>
                      {i.smsBody && <p className="mt-2 text-sm">{i.smsBody}</p>}
                      {i.aiSummary && (
                        <p className="mt-2 rounded bg-muted/40 p-2 text-xs italic">{i.aiSummary}</p>
                      )}
                      {i.recordingUrl && (
                        <div className="mt-2"><RecordingPlayer interactionId={i.id} /></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Chat compartilhado */}
        <Card className="flex h-[70vh] flex-col lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-base">Conversa</CardTitle>
            <p className="text-xs text-muted-foreground">Fale com sua agência sobre este lead.</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex-1 space-y-3 overflow-auto">
              {lead.notes.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda. Comece a conversa abaixo.</p>
              )}
              {lead.notes.map((n) => {
                const mine = n.authorRole === 'client_viewer';
                return (
                  <div key={n.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        mine ? 'bg-brand-gradient text-white' : 'border bg-muted/40'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{n.body}</p>
                    </div>
                    <span className="mt-1 text-[11px] text-muted-foreground">
                      {n.author?.fullName ?? '—'}
                      {n.authorRole && ` · ${ROLE_LABEL[n.authorRole] ?? n.authorRole}`} ·{' '}
                      {new Date(n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (msg.trim()) send.mutate(msg.trim());
              }}
              className="flex items-end gap-2 border-t pt-3"
            >
              <Textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Escreva uma mensagem..."
                rows={2}
                className="resize-none"
              />
              <Button type="submit" size="icon" disabled={!msg.trim() || send.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
