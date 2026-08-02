'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Save,
  ExternalLink,
  UserPlus,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  MessageSquare,
  Voicemail,
  FormInput,
  CalendarClock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTenantStore } from '@/stores/tenant-store';
import { useTranslate } from '@/i18n/provider';
import { LeadCustomFields, leadHasCustomFields } from '@/components/lead-custom-fields';
import {
  LEAD_STATUS_COLOR,
  LEAD_STATUS_LABELS,
  LEAD_ACQUISITION_LABELS,
  type LeadStatus,
} from '@/components/interaction-drawer';

const ACQUISITION_CHANNELS = Object.keys(LEAD_ACQUISITION_LABELS) as Array<
  keyof typeof LEAD_ACQUISITION_LABELS
>;

/** ISO -> valor do <input type="datetime-local"> (hora local, sem timezone). */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface LeadInteraction {
  id: string;
  type: 'call' | 'sms' | 'voicemail' | 'meta_form';
  direction: 'inbound' | 'outbound';
  status: string;
  startedAt: string;
  durationSeconds: number | null;
  smsBody: string | null;
}

interface LeadNote {
  id: string;
  body: string;
  shared: boolean;
  authorRole: string | null;
  createdAt: string;
  author: { id: string; fullName: string } | null;
}

interface LeadDetail {
  id: string;
  name: string | null;
  phoneE164: string | null;
  email: string | null;
  status: LeadStatus;
  source: string;
  customFields: Record<string, unknown> | null;
  scheduledEstimateAt: string | null;
  createdAt: string;
  interactions: LeadInteraction[];
  notes: LeadNote[];
}

export interface LeadDrawerTarget {
  id: string;
  subAccountId?: string;
  subAccountName?: string;
  name?: string | null;
  phoneE164?: string | null;
  email?: string | null;
  status?: LeadStatus;
  createdAt?: string;
}

const TYPE_ICONS = {
  call: Phone,
  sms: MessageSquare,
  voicemail: Voicemail,
  meta_form: FormInput,
};

export function LeadDrawer({
  lead,
  onClose,
  onOpenInteraction,
}: {
  lead: LeadDrawerTarget | null;
  onClose: () => void;
  onOpenInteraction?: (id: string) => void;
}) {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const router = useRouter();
  const setTenant = useTenantStore((s) => s.setTenant);
  const [note, setNote] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const leadId = lead?.id ?? null;
  const subAccountId = lead?.subAccountId;

  const { data: detail } = useQuery<LeadDetail | null>({
    queryKey: ['lead-detail', leadId],
    queryFn: () => apiClient.get(`/leads/${leadId}`, { subAccountId }),
    enabled: !!leadId && !!subAccountId,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (leadId) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [leadId, onClose]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['lead-detail', leadId] });
    qc.invalidateQueries({ queryKey: ['my-leads'] });
    // box de "novos leads" do painel do agente (query própria, status=new)
    qc.invalidateQueries({ queryKey: ['my-leads-new'] });
  };

  const updateStatus = useMutation({
    mutationFn: (status: LeadStatus) =>
      apiClient.patch(`/leads/${leadId}`, { status }, { subAccountId }),
    onSuccess: () => {
      toast.success(t('interactionDrawer.statusUpdated'));
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateName = useMutation({
    mutationFn: (name: string) =>
      apiClient.patch(`/leads/${leadId}`, { name }, { subAccountId }),
    onSuccess: () => {
      toast.success(t('interactionDrawer.nameSaved'));
      setEditingName(false);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateChannel = useMutation({
    mutationFn: (channel: string) => {
      const current = (detail?.customFields as Record<string, unknown> | undefined) ?? {};
      const customFields = channel
        ? { ...current, acquisitionChannel: channel }
        : Object.fromEntries(Object.entries(current).filter(([k]) => k !== 'acquisitionChannel'));
      return apiClient.patch(`/leads/${leadId}`, { customFields }, { subAccountId });
    },
    onSuccess: () => {
      toast.success(t('interactionDrawer.sourceUpdated'));
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateEstimate = useMutation({
    mutationFn: (iso: string | null) =>
      apiClient.patch(`/leads/${leadId}`, { scheduledEstimateAt: iso }, { subAccountId }),
    onSuccess: () => {
      toast.success(t('leadDrawer.estimateSaved'));
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addNote = useMutation({
    mutationFn: (body: string) =>
      apiClient.post(`/leads/${leadId}/notes`, { body }, { subAccountId }),
    onSuccess: () => {
      toast.success(t('interactionDrawer.noteSaved'));
      setNote('');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!lead) return null;

  const name = detail?.name ?? lead.name ?? null;
  const phone = detail?.phoneE164 ?? lead.phoneE164 ?? null;
  const email = detail?.email ?? lead.email ?? null;
  const status = detail?.status ?? lead.status ?? 'new';
  const createdAt = detail?.createdAt ?? lead.createdAt;
  const channel = (detail?.customFields?.acquisitionChannel as string | undefined) ?? '';

  const openFullLead = () => {
    if (!subAccountId) return;
    setTenant(subAccountId, lead.subAccountName ?? '');
    router.push(`/workspace/leads/${lead.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="flex w-[540px] flex-col overflow-auto bg-background">
        <div className="sticky top-0 flex items-center justify-between border-b bg-background p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <UserPlus className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">{t('interactionDrawer.lead')}</p>
              <p className="font-medium">{name ?? phone ?? email ?? '—'}</p>
              {createdAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(createdAt).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 p-4">
          {/* Info + edição */}
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
                      setNameInput(name ?? '');
                      setEditingName(true);
                    }}
                    className="group mt-1 flex items-center gap-1.5 text-left"
                  >
                    <span className="font-medium">
                      {name ?? (
                        <span className="italic text-muted-foreground">{t('interactionDrawer.addName')}</span>
                      )}
                    </span>
                    <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100">
                      {t('interactionDrawer.edit')}
                    </span>
                  </button>
                )}
                {phone && <p className="mt-0.5 font-mono text-xs text-muted-foreground">{phone}</p>}
                {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
              </div>
              <select
                value={status}
                onChange={(e) => updateStatus.mutate(e.target.value as LeadStatus)}
                disabled={updateStatus.isPending}
                className={`h-9 shrink-0 rounded-md border px-3 text-sm font-medium ${LEAD_STATUS_COLOR[status]}`}
              >
                {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
                  <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs text-muted-foreground">{t('interactionDrawer.source')}</label>
              <select
                value={channel}
                onChange={(e) => updateChannel.mutate(e.target.value)}
                disabled={updateChannel.isPending}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="">{t('interactionDrawer.notDefined')}</option>
                {ACQUISITION_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>{LEAD_ACQUISITION_LABELS[ch]}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
              <label className="text-xs text-muted-foreground">{t('leadDrawer.scheduledEstimate')}</label>
              <input
                type="datetime-local"
                value={toLocalInput(detail?.scheduledEstimateAt ?? null)}
                onChange={(e) =>
                  updateEstimate.mutate(e.target.value ? new Date(e.target.value).toISOString() : null)
                }
                disabled={updateEstimate.isPending}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              />
              {detail?.scheduledEstimateAt && (
                <button
                  onClick={() => updateEstimate.mutate(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  title={t('leadDrawer.estimateClear')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {subAccountId && (
              <button
                onClick={openFullLead}
                className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> {t('interactionDrawer.openFullLead')}
              </button>
            )}
          </section>

          {/* Respostas do quiz/formulário */}
          {leadHasCustomFields(detail?.customFields) && (
            <section className="rounded-md border p-3">
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                {t('leadDrawer.formAnswers')}
              </p>
              <LeadCustomFields customFields={detail?.customFields} compact />
            </section>
          )}

          {/* Histórico de interações */}
          <section>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              {t('leadDetail.timeline')}
            </p>
            {!detail?.interactions?.length ? (
              <p className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                {t('leadDetail.noInteractions')}
              </p>
            ) : (
              <div className="space-y-1.5">
                {detail.interactions.map((i) => (
                  <InteractionItem key={i.id} item={i} onOpen={onOpenInteraction} />
                ))}
              </div>
            )}
          </section>

          {/* Observações */}
          <section>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              {t('leadDetail.notesTitle')}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">{t('leadDetail.notesHint')}</p>
            {detail?.notes?.length ? (
              <div className="mb-3 space-y-2">
                {detail.notes.map((n) => (
                  <div key={n.id} className="rounded-md border bg-muted/20 p-2 text-sm">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {n.author?.fullName ?? '—'} · {new Date(n.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-sm text-muted-foreground">{t('leadDetail.noNotes')}</p>
            )}
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('leadDetail.notePlaceholder')}
              rows={3}
            />
            <Button
              size="sm"
              className="mt-2"
              onClick={() => addNote.mutate(note)}
              disabled={!note.trim() || addNote.isPending}
            >
              <Save className="h-4 w-4" /> {t('leadDetail.saveNote')}
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}

function InteractionItem({
  item,
  onOpen,
}: {
  item: LeadInteraction;
  onOpen?: (id: string) => void;
}) {
  const { t } = useTranslate();
  const Icon =
    item.type === 'call'
      ? item.direction === 'inbound'
        ? PhoneIncoming
        : PhoneOutgoing
      : TYPE_ICONS[item.type];

  const label =
    item.type === 'call'
      ? item.direction === 'inbound'
        ? t('leadDetail.callInbound')
        : t('leadDetail.callOutbound')
      : item.type === 'sms'
        ? item.direction === 'inbound'
          ? t('leadDetail.smsInbound')
          : t('leadDetail.smsOutbound')
        : item.type === 'voicemail'
          ? t('leadDetail.voicemail')
          : t('leadDetail.metaForm');

  return (
    <button
      onClick={() => onOpen?.(item.id)}
      disabled={!onOpen}
      className="flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors enabled:hover:bg-muted/40 disabled:cursor-default"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{label}</p>
        {item.smsBody && <p className="truncate text-xs text-muted-foreground">{item.smsBody}</p>}
      </div>
      <div className="shrink-0 text-right text-xs text-muted-foreground">
        <p>{new Date(item.startedAt).toLocaleDateString('pt-BR')}</p>
        {item.durationSeconds ? (
          <p>{Math.floor(item.durationSeconds / 60)}:{(item.durationSeconds % 60).toString().padStart(2, '0')}</p>
        ) : null}
      </div>
    </button>
  );
}
