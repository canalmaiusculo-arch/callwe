'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, ExternalLink, Phone, MessageSquare, Voicemail, FormInput, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RecordingPlayer } from '@/components/recording-player';
import { LeadCustomFields, leadHasCustomFields } from '@/components/lead-custom-fields';
import { useTenantStore } from '@/stores/tenant-store';
import { useTranslate } from '@/i18n/provider';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

const ACQUISITION_CHANNELS = ['meta', 'lsa', 'google_ads', 'organic', 'gmb', 'not_identified'] as const;
type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];
const ACQUISITION_LABELS: Record<AcquisitionChannel, string> = {
  meta: 'Meta',
  lsa: 'LSA',
  google_ads: 'Google ADS',
  organic: 'Orgânico',
  gmb: 'GMB',
  not_identified: 'Não identificado',
};
export const LEAD_ACQUISITION_LABELS = ACQUISITION_LABELS;
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  won: 'Ganho',
  lost: 'Perdido',
};
const STATUS_COLOR: Record<LeadStatus, string> = {
  new: 'bg-slate-100 text-slate-700 border-slate-200',
  contacted: 'bg-blue-100 text-blue-700 border-blue-200',
  qualified: 'bg-amber-100 text-amber-700 border-amber-200',
  won: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  lost: 'bg-red-100 text-red-700 border-red-200',
};

export const LEAD_STATUS_LABELS = STATUS_LABELS;
export const LEAD_STATUS_COLOR = STATUS_COLOR;
export type { LeadStatus };

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
  lead: {
    id: string;
    name: string | null;
    phoneE164: string | null;
    status: LeadStatus;
    customFields?: Record<string, unknown> | null;
  } | null;
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
  const { t } = useTranslate();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const { data: interaction } = useQuery<InteractionDetail | null>({
    queryKey: ['interaction-detail', interactionId],
    queryFn: () => apiClient.get(`/interactions/mine/${interactionId}`),
    enabled: !!interactionId,
  });

  const subAccountId = interaction?.subAccount?.id;
  const subAccountName = interaction?.subAccount?.name;
  const router = useRouter();
  const setTenant = useTenantStore((s) => s.setTenant);

  const openFullLead = () => {
    if (!interaction?.lead?.id || !subAccountId || !subAccountName) return;
    setTenant(subAccountId, subAccountName);
    router.push(`/workspace/leads/${interaction.lead.id}`);
  };

  const addNote = useMutation({
    mutationFn: (body: string) =>
      apiClient.post(
        `/leads/${interaction!.lead!.id}/notes`,
        { body },
        { subAccountId },
      ),
    onSuccess: () => {
      toast.success(t('interactionDrawer.noteSaved'));
      setNote('');
      qc.invalidateQueries({ queryKey: ['lead', interaction?.lead?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: (status: LeadStatus) =>
      apiClient.patch(
        `/leads/${interaction!.lead!.id}`,
        { status },
        { subAccountId },
      ),
    onSuccess: () => {
      toast.success(t('interactionDrawer.statusUpdated'));
      qc.invalidateQueries({ queryKey: ['interaction-detail', interactionId] });
      qc.invalidateQueries({ queryKey: ['my-calls'] });
      qc.invalidateQueries({ queryKey: ['my-sms'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateName = useMutation({
    mutationFn: (name: string) =>
      apiClient.patch(
        `/leads/${interaction!.lead!.id}`,
        { name },
        { subAccountId },
      ),
    onSuccess: () => {
      toast.success(t('interactionDrawer.nameSaved'));
      setEditingName(false);
      qc.invalidateQueries({ queryKey: ['interaction-detail', interactionId] });
      qc.invalidateQueries({ queryKey: ['my-calls'] });
      qc.invalidateQueries({ queryKey: ['my-sms'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendWhatsappSummary = useMutation({
    mutationFn: () =>
      apiClient.post(`/whatsapp/send-summary/${interactionId}`, {}),
    onSuccess: () => {
      toast.success(t('interactionDrawer.summarySent'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateChannel = useMutation({
    mutationFn: (channel: AcquisitionChannel | '') => {
      const currentCustomFields =
        (interaction?.lead?.customFields as Record<string, unknown> | undefined) ?? {};
      const customFields = channel
        ? { ...currentCustomFields, acquisitionChannel: channel }
        : Object.fromEntries(Object.entries(currentCustomFields).filter(([k]) => k !== 'acquisitionChannel'));
      return apiClient.patch(
        `/leads/${interaction!.lead!.id}`,
        { customFields },
        { subAccountId },
      );
    },
    onSuccess: () => {
      toast.success(t('interactionDrawer.sourceUpdated'));
      qc.invalidateQueries({ queryKey: ['interaction-detail', interactionId] });
      qc.invalidateQueries({ queryKey: ['my-calls'] });
      qc.invalidateQueries({ queryKey: ['my-sms'] });
    },
    onError: (err: Error) => toast.error(err.message),
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
        <div className="w-[520px] bg-background p-6">{t('interactionDrawer.loading')}</div>
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
                  ? interaction.direction === 'inbound'
                    ? t('interactionDrawer.callInbound')
                    : t('interactionDrawer.callOutbound')
                  : interaction.type === 'sms'
                    ? interaction.direction === 'inbound'
                      ? t('interactionDrawer.smsInbound')
                      : t('interactionDrawer.smsOutbound')
                    : interaction.type === 'voicemail'
                      ? t('interactionDrawer.voicemail')
                      : t('interactionDrawer.form')}
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
            <InfoBox label={t('interactionDrawer.client')} value={interaction.subAccount?.name ?? '—'} />
            <InfoBox label={t('interactionDrawer.agent')} value={interaction.agent?.fullName ?? '—'} />
            <InfoBox
              label={t('interactionDrawer.duration')}
              value={interaction.durationSeconds ? formatDuration(interaction.durationSeconds) : '—'}
            />
            <InfoBox label={t('interactionDrawer.status')} value={interaction.status} />
          </div>

          {interaction.recordingUrl && (
            <section>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{t('interactionDrawer.recording')}</p>
              <RecordingPlayer interactionId={interaction.id} subAccountId={subAccountId} />
            </section>
          )}

          {interaction.smsBody && (
            <section>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{t('interactionDrawer.message')}</p>
              <p className="rounded-md border bg-muted/30 p-3 text-sm">{interaction.smsBody}</p>
            </section>
          )}

          {(interaction.aiSummary || interaction.sentiment || interaction.aiScore) && (
            <section className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="mb-2 text-xs font-medium uppercase text-blue-700">{t('interactionDrawer.aiAnalysis')}</p>
              {interaction.aiSummary && <p className="text-sm">{interaction.aiSummary}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {interaction.sentiment && (
                  <Badge variant={SENTIMENT_COLOR[interaction.sentiment]}>
                    {interaction.sentiment}
                  </Badge>
                )}
                {interaction.aiScore !== null && (
                  <Badge variant="outline">{t('interactionDrawer.score')}: {interaction.aiScore}/100</Badge>
                )}
                {interaction.aiTopics?.map((t) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
            </section>
          )}

          {(() => {
            const action = classifyForWhatsapp(interaction);
            if (!action) return null;
            return (
              <section className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-2 text-xs font-medium uppercase text-emerald-700">
                  {t('interactionDrawer.reportToClient')}
                </p>
                <p className="mb-2 text-xs text-emerald-900/80">{t(action.preview)}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-300 bg-white"
                  onClick={() => sendWhatsappSummary.mutate()}
                  disabled={sendWhatsappSummary.isPending}
                >
                  <Send className="mr-1 h-3 w-3" />
                  {sendWhatsappSummary.isPending ? t('interactionDrawer.sending') : t(action.label)}
                </Button>
              </section>
            );
          })()}

          {interaction.transcript && (
            <section>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{t('interactionDrawer.transcript')}</p>
              <div className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                {interaction.transcript}
              </div>
            </section>
          )}

          {interaction.lead && (
            <>
              <section className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase text-muted-foreground">{t('interactionDrawer.lead')}</p>
                    {editingName ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          autoFocus
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && nameInput.trim()) updateName.mutate(nameInput.trim());
                            if (e.key === 'Escape') setEditingName(false);
                          }}
                          placeholder={t('interactionDrawer.clientNamePlaceholder')}
                          className="h-8 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <Button
                          size="sm"
                          onClick={() => nameInput.trim() && updateName.mutate(nameInput.trim())}
                          disabled={!nameInput.trim() || updateName.isPending}
                        >
                          {t('interactionDrawer.save')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                          {t('interactionDrawer.cancel')}
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setNameInput(interaction.lead?.name ?? '');
                          setEditingName(true);
                        }}
                        className="group mt-1 flex items-center gap-1.5 text-left"
                      >
                        <span className="font-medium">
                          {interaction.lead.name ?? <span className="italic text-muted-foreground">{t('interactionDrawer.addName')}</span>}
                        </span>
                        <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100">{t('interactionDrawer.edit')}</span>
                      </button>
                    )}
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{interaction.lead.phoneE164}</p>
                  </div>
                  <select
                    value={interaction.lead.status}
                    onChange={(e) => updateStatus.mutate(e.target.value as LeadStatus)}
                    disabled={updateStatus.isPending}
                    className={`h-9 shrink-0 rounded-md border px-3 text-sm font-medium ${STATUS_COLOR[interaction.lead.status]}`}
                  >
                    {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">{t('interactionDrawer.source')}</label>
                  <select
                    value={
                      (interaction.lead.customFields?.acquisitionChannel as string | undefined) ?? ''
                    }
                    onChange={(e) => updateChannel.mutate(e.target.value as AcquisitionChannel | '')}
                    disabled={updateChannel.isPending}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="">{t('interactionDrawer.notDefined')}</option>
                    {ACQUISITION_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>{ACQUISITION_LABELS[ch]}</option>
                    ))}
                  </select>
                </div>
                {leadHasCustomFields(interaction.lead.customFields) && (
                  <div className="mt-3 border-t pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
                      {t('leadDrawer.formAnswers')}
                    </p>
                    <LeadCustomFields customFields={interaction.lead.customFields} compact />
                  </div>
                )}
                <button
                  onClick={openFullLead}
                  className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" /> {t('interactionDrawer.openFullLead')}
                </button>
              </section>

              <section>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  {t('interactionDrawer.noteAboutCall')}
                </p>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('interactionDrawer.notePlaceholder')}
                  rows={4}
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => addNote.mutate(note)}
                  disabled={!note.trim() || addNote.isPending}
                >
                  <Save className="h-4 w-4" /> {t('interactionDrawer.saveNote')}
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

function classifyForWhatsapp(i: InteractionDetail): { label: string; preview: string } | null {
  if (i.type !== 'call') return null;
  if (i.aiSummary?.trim()) {
    return {
      label: 'interactionDrawer.actionSendSummaryLabel',
      preview: 'interactionDrawer.actionSendSummaryPreview',
    };
  }
  if (i.direction === 'inbound' && i.status === 'missed') {
    return {
      label: 'interactionDrawer.actionMissedLabel',
      preview: 'interactionDrawer.actionMissedPreview',
    };
  }
  if (i.direction === 'outbound' && (!i.durationSeconds || i.durationSeconds < 5)) {
    return {
      label: 'interactionDrawer.actionCallbackLabel',
      preview: 'interactionDrawer.actionCallbackPreview',
    };
  }
  return null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
