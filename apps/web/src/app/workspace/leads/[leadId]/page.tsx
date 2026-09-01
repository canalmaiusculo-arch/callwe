'use client';

import { use, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, MessageSquare, Voicemail, FormInput, Save, PhoneCall } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useTranslate } from '@/i18n/provider';
import { RecordingPlayer } from '@/components/recording-player';
import { LeadCustomFields, leadHasCustomFields } from '@/components/lead-custom-fields';
import { ThumbtackDetails, thumbtackHasData } from '@/components/thumbtack-lead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

const STATUS_KEYS: LeadStatus[] = ['new', 'contacted', 'qualified', 'won', 'lost'];

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
  customFields: Record<string, unknown> | null;
  createdAt: string;
  interactions: Interaction[];
  notes: Array<{
    id: string;
    body: string;
    createdAt: string;
    shared: boolean;
    authorRole: string | null;
    author: { id: string; fullName: string } | null;
  }>;
}

const ROLE_KEY: Record<string, string> = {
  client_viewer: 'roleClient', agent: 'roleAgent', sub_account_admin: 'roleAgent',
  agency_admin: 'roleAgency', super_admin: 'roleAgency',
};

const ICONS = {
  call: Phone,
  sms: MessageSquare,
  voicemail: Voicemail,
  meta_form: FormInput,
};

export default function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { t } = useTranslate();
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
      toast.success(t('leadDetail.toastUpdated'));
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addNote = useMutation({
    mutationFn: (body: string) => apiClient.post(`/leads/${leadId}/notes`, { body }),
    onSuccess: () => {
      setNewNote('');
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
      toast.success(t('leadDetail.toastNoteAdded'));
    },
  });

  const callLead = useMutation({
    mutationFn: () => apiClient.post(`/leads/${leadId}/call`, {}),
    onSuccess: () => toast.success(t('leadDetail.toastCalling')),
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">{t('leadDetail.loading')}</div>;
  if (!lead) return <div className="p-8">{t('leadDetail.notFound')}</div>;

  // Observações internas (o chat compartilhado fica no widget de conversas).
  const internalNotes = lead.notes.filter((n) => !n.shared);

  return (
    <div className="grid h-screen grid-cols-12 gap-4 overflow-auto p-8">
      <section className="col-span-8 space-y-4">
        <header>
          <Link href={'/workspace/leads' as never} className="text-sm text-muted-foreground hover:underline">
            ← {t('leadDetail.backToLeads')}
          </Link>
          <div className="mt-2 flex items-start justify-between">
            <div>
              <Input
                value={lead.name ?? ''}
                onChange={(e) => update.mutate({ name: e.target.value })}
                placeholder={t('leadDetail.namePlaceholder')}
                className="border-0 px-0 text-2xl font-bold shadow-none focus-visible:ring-0 md:text-3xl"
              />
              <div className="mt-2 flex gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{lead.phoneE164}</span>
                {lead.email && <span>· {lead.email}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={() => callLead.mutate()}
                disabled={!lead.phoneE164 || callLead.isPending}
              >
                <PhoneCall className="h-4 w-4" />
                {callLead.isPending ? t('leadDetail.calling') : t('leadDetail.call')}
              </Button>
              <select
                value={lead.status}
                onChange={(e) => update.mutate({ status: e.target.value as LeadStatus })}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {STATUS_KEYS.map((s) => (
                  <option key={s} value={s}>{t(`leadDetail.status_${s}`)}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {leadHasCustomFields(lead.customFields) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FormInput className="h-4 w-4" />
                </span>
                {thumbtackHasData(lead.customFields) ? t('leadDrawer.thumbtackDetails') : t('leadDrawer.formAnswers')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {thumbtackHasData(lead.customFields) ? (
                <ThumbtackDetails customFields={lead.customFields} />
              ) : (
                <LeadCustomFields customFields={lead.customFields} />
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('leadDetail.timeline')} ({lead.interactions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.interactions.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('leadDetail.noInteractions')}</p>
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
            <CardTitle>{t('leadDetail.notesTitle')}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {t('leadDetail.notesHint')}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={t('leadDetail.notePlaceholder')}
              rows={4}
            />
            <Button
              size="sm"
              onClick={() => addNote.mutate(newNote)}
              disabled={!newNote.trim() || addNote.isPending}
            >
              <Save className="h-4 w-4" /> {t('leadDetail.saveNote')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('leadDetail.notesHistory')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {internalNotes.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('leadDetail.noNotes')}</p>
            )}
            {internalNotes.map((n) => (
              <div key={n.id} className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  {n.author?.fullName ?? '—'}
                  {n.authorRole && ` · ${ROLE_KEY[n.authorRole] ? t(`leadDetail.${ROLE_KEY[n.authorRole]}`) : n.authorRole}`} ·{' '}
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
  const { t } = useTranslate();
  const Icon = ICONS[interaction.type];
  return (
    <div className="flex gap-3 rounded-md border p-3">
      <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {interaction.type === 'call'
              ? interaction.direction === 'inbound' ? t('leadDetail.callInbound') : t('leadDetail.callOutbound')
              : interaction.type === 'sms'
                ? interaction.direction === 'inbound' ? t('leadDetail.smsInbound') : t('leadDetail.smsOutbound')
                : interaction.type === 'voicemail'
                  ? t('leadDetail.voicemail')
                  : t('leadDetail.metaForm')}
          </p>
          <span className="text-xs text-muted-foreground">
            {new Date(interaction.startedAt).toLocaleString('pt-BR')}
          </span>
        </div>
        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
          {interaction.durationSeconds !== null && (
            <span>{t('leadDetail.duration')}: {formatDuration(interaction.durationSeconds)}</span>
          )}
          {interaction.agent && <span>{t('leadDetail.agent')}: {interaction.agent.fullName}</span>}
          <Badge variant="secondary" className="text-xs">{interaction.status}</Badge>
        </div>
        {interaction.smsBody && <p className="mt-2 text-sm">{interaction.smsBody}</p>}
        {interaction.aiSummary && (
          <p className="mt-2 rounded bg-muted/40 p-2 text-xs italic">{interaction.aiSummary}</p>
        )}
        {interaction.recordingUrl && (
          <div className="mt-2">
            <RecordingPlayer interactionId={interaction.id} />
          </div>
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
