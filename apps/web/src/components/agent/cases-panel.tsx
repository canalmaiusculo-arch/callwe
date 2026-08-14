'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Phone,
  MessageSquare,
  FileText,
  CalendarClock,
  CheckCircle2,
  X,
  Clock,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslate } from '@/i18n/provider';

type CaseTab = 'open' | 'follow_up' | 'resolved';

interface AssignedClient {
  id: string;
  name: string;
}

interface CaseItem {
  id: string;
  caseStatus: CaseTab;
  source: string;
  name: string | null;
  phoneE164: string | null;
  email: string | null;
  address: string | null;
  subAccount: { id: string; name: string } | null;
  createdAt: string;
  followUpAt: string | null;
  followUpReason: string | null;
  followUpUser: { id: string; fullName: string } | null;
  resolvedAt: string | null;
  resolvedBy: { id: string; fullName: string } | null;
  caseOutcome: 'booked' | 'won' | 'lost' | null;
  resolutionNote: string | null;
  visitAt: string | null;
  visitConfirmed: boolean;
  interactionsCount: number;
  notesCount: number;
  lastInteractionAt: string | null;
  overdue: boolean;
}

interface Counts {
  open: number;
  follow_up: number;
  resolved: number;
  overdue: number;
}

const ORIGINS = ['all', 'calls', 'sms', 'meta', 'organic'] as const;

export function CasesPanel({
  agentId,
  agencyId,
  filterSubAccountId,
  activeSubAccountIds,
  clients,
  canCleanup,
}: {
  agentId?: string;
  agencyId?: string;
  filterSubAccountId: string | null;
  activeSubAccountIds?: string[] | null;
  clients: AssignedClient[];
  canCleanup?: boolean;
}) {
  // Parâmetro de escopo repassado aos endpoints (atendente supervisionado ou agência).
  const scopeParam = agentId ? `agentId=${agentId}` : agencyId ? `agencyId=${agencyId}` : '';
  const { t } = useTranslate();
  const [tab, setTab] = useState<CaseTab>('open');
  const [date, setDate] = useState('');
  const [origin, setOrigin] = useState<(typeof ORIGINS)[number]>('all');
  const [outcome, setOutcome] = useState<'all' | 'booked' | 'won' | 'lost'>('all');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showCleanup, setShowCleanup] = useState(false);
  const [followUpFor, setFollowUpFor] = useState<CaseItem | null>(null);
  const [resolveFor, setResolveFor] = useState<CaseItem | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['cases'] });
    qc.invalidateQueries({ queryKey: ['case-counts'] });
  };

  const { data: counts } = useQuery<Counts>({
    queryKey: ['case-counts', scopeParam],
    queryFn: () => apiClient.get(`/cases/counts${scopeParam ? `?${scopeParam}` : ''}`),
    refetchInterval: 60_000,
  });

  const { data: cases = [], isLoading } = useQuery<CaseItem[]>({
    queryKey: ['cases', tab, origin, outcome, date, search, filterSubAccountId, scopeParam],
    queryFn: () => {
      const p = new URLSearchParams({ tab });
      if (origin !== 'all') p.set('origin', origin);
      if (tab === 'resolved' && outcome !== 'all') p.set('outcome', outcome);
      if (date) p.set('date', date);
      if (search) p.set('search', search);
      if (filterSubAccountId) p.set('subAccountId', filterSubAccountId);
      if (agentId) p.set('agentId', agentId);
      if (agencyId) p.set('agencyId', agencyId);
      return apiClient.get(`/cases/mine?${p.toString()}`);
    },
    refetchInterval: 45_000,
  });

  // "Só ativos" (sem cliente específico selecionado) restringe aos clientes ativos.
  const visibleCases =
    activeSubAccountIds && !filterSubAccountId
      ? cases.filter((c) => activeSubAccountIds.includes(c.subAccount?.id ?? ''))
      : cases;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">{t('cases.title')}</h2>
          {counts && (
            <Badge variant="secondary" className="ml-1">
              {counts.open} {t('cases.openShort')}
            </Badge>
          )}
          {counts && counts.overdue > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {counts.overdue} {t('cases.overdue')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCleanup && (
            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setShowCleanup(true)}>
              <Trash2 className="h-4 w-4" /> {t('cases.cleanup')}
            </Button>
          )}
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> {t('cases.newCase')}
          </Button>
        </div>
      </div>

      {/* Sub-abas */}
      <div className="flex gap-4 border-b text-sm">
        <TabLink active={tab === 'open'} onClick={() => setTab('open')} label={`${t('cases.tabOpen')} (${counts?.open ?? 0})`} />
        <TabLink active={tab === 'follow_up'} onClick={() => setTab('follow_up')} label={`${t('cases.tabFollowUp')} (${counts?.follow_up ?? 0})`} />
        <TabLink active={tab === 'resolved'} onClick={() => setTab('resolved')} label={`${t('cases.tabResolved')} (${counts?.resolved ?? 0})`} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('cases.searchPlaceholder')}
            className="h-8 w-56 pl-7 text-sm"
          />
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        />
        <select
          value={origin}
          onChange={(e) => setOrigin(e.target.value as never)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          {ORIGINS.map((o) => (
            <option key={o} value={o}>
              {t(`cases.origin_${o}`)}
            </option>
          ))}
        </select>
        {tab === 'resolved' && (
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as never)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="all">{t('cases.outcomeAll')}</option>
            <option value="booked">{t('cases.outcome_booked')}</option>
            <option value="won">{t('cases.outcome_won')}</option>
            <option value="lost">{t('cases.outcome_lost')}</option>
          </select>
        )}
        {(date || origin !== 'all' || search || outcome !== 'all') && (
          <Button size="sm" variant="ghost" onClick={() => { setDate(''); setOrigin('all'); setOutcome('all'); setSearch(''); }}>
            {t('cases.clearFilters')}
          </Button>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{t('cases.loading')}</p>
      ) : visibleCases.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">{t('cases.empty')}</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleCases.map((c) => (
            <CaseCard
              key={c.id}
              item={c}
              onFollowUp={() => setFollowUpFor(c)}
              onResolve={() => setResolveFor(c)}
              onReopen={async () => {
                await apiClient.post(`/cases/${c.id}/reopen`, {});
                toast.success(t('cases.reopened'));
                invalidate();
              }}
              onExpandFull={() => setDetailId(c.id)}
            />
          ))}
        </div>
      )}

      {showNew && <NewCaseModal clients={clients} onClose={() => setShowNew(false)} onDone={invalidate} />}
      {showCleanup && <CleanupModal agencyId={agencyId} onClose={() => setShowCleanup(false)} onDone={invalidate} />}
      {followUpFor && (
        <FollowUpModal caseItem={followUpFor} onClose={() => setFollowUpFor(null)} onDone={invalidate} />
      )}
      {resolveFor && (
        <ResolveModal caseItem={resolveFor} onClose={() => setResolveFor(null)} onDone={invalidate} />
      )}
      {detailId && <CaseDetailModal caseId={detailId} onClose={() => setDetailId(null)} onChanged={invalidate} />}
    </div>
  );
}

function TabLink({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 pb-2 pt-1 font-medium transition-colors ${
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

const OUTCOME_VARIANT: Record<string, 'success' | 'secondary' | 'destructive'> = {
  booked: 'secondary',
  won: 'success',
  lost: 'destructive',
};

function CaseCard({
  item,
  onFollowUp,
  onResolve,
  onReopen,
  onExpandFull,
}: {
  item: CaseItem;
  onFollowUp: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onExpandFull: () => void;
}) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const shortId = item.id.slice(0, 8);

  const { data: detail } = useQuery<CaseDetail>({
    queryKey: ['case', item.id],
    queryFn: () => apiClient.get(`/cases/${item.id}`),
    enabled: open,
  });

  return (
    <Card className={item.overdue ? 'border-red-300' : undefined}>
      <CardContent className="p-0">
        {/* Cabeçalho */}
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">#{shortId}</span>
              <span className="font-semibold text-primary">{item.name ?? item.phoneE164 ?? '—'}</span>
              {item.phoneE164 && item.name && <span className="text-xs text-muted-foreground">({item.phoneE164})</span>}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.subAccount?.name ?? '—'}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <p className="text-[11px] text-muted-foreground">{t('cases.createdAt')}: {fmtDateTime(item.createdAt)}</p>
            <div className="flex items-center gap-1.5">
              <StatusPill item={item} />
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </button>

        {open && (
          <div className="space-y-3 border-t px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t('cases.quickData')}</p>
              <Button size="sm" variant="outline" onClick={onExpandFull}>
                {t('cases.expandFull')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label={t('cases.fieldName')} value={item.name} />
              <Field label={t('cases.fieldPhone')} value={item.phoneE164} />
              <Field label={t('cases.fieldEmail')} value={item.email} />
              <Field label={t('cases.fieldAddress')} value={item.address} />
            </div>

            <div className="rounded-lg border bg-muted/20 p-2">
              <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">{t('cases.lastRecords')}</p>
              <div className="max-h-52 space-y-1.5 overflow-auto">
                {!detail && <p className="py-2 text-center text-xs text-muted-foreground">{t('cases.loading')}</p>}
                {detail && detail.interactions.length === 0 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">{t('cases.noRecords')}</p>
                )}
                {detail?.interactions.map((i) => (
                  <InteractionRow key={i.id} it={i} />
                ))}
              </div>
            </div>

            {item.caseStatus === 'resolved' && item.resolutionNote && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                <strong>{t(`cases.outcome_${item.caseOutcome}`)}:</strong> {item.resolutionNote}
                {item.resolvedBy && <span className="block text-emerald-700">— {item.resolvedBy.fullName}</span>}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {t('cases.interactions')}: {item.interactionsCount}
              </span>
              <div className="flex gap-2">
                {item.caseStatus === 'resolved' ? (
                  <Button size="sm" variant="outline" onClick={onReopen}>
                    {t('cases.reopen')}
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={onFollowUp}>
                      <CalendarClock className="h-4 w-4" /> {t('cases.toFollowUp')}
                    </Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onResolve}>
                      <CheckCircle2 className="h-4 w-4" /> {t('cases.resolveCase')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusPill({ item }: { item: CaseItem }) {
  const { t } = useTranslate();
  if (item.caseStatus === 'resolved') {
    return <Badge variant={OUTCOME_VARIANT[item.caseOutcome ?? 'booked']}>{t(`cases.outcome_${item.caseOutcome}`)}</Badge>;
  }
  if (item.overdue) {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {t('cases.overdue')}</Badge>;
  }
  if (item.caseStatus === 'follow_up') {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" /> {item.followUpAt ? fmtDateTime(item.followUpAt) : t('cases.tabFollowUp')}
      </Badge>
    );
  }
  return <Badge variant="secondary">{t('cases.pending')}</Badge>;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] text-muted-foreground">{label}</p>
      <div className="truncate rounded-md border bg-background px-2 py-1.5 text-sm">{value || '—'}</div>
    </div>
  );
}

const IT_ICON: Record<string, typeof Phone> = { call: Phone, sms: MessageSquare, voicemail: Phone, meta_form: FileText };

function InteractionRow({ it }: { it: CaseInteraction }) {
  const Icon = IT_ICON[it.type] ?? Phone;
  const missed = it.status === 'missed' || it.status === 'no_answer';
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background p-2 text-xs">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${missed ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{it.fromNumber ?? it.toNumber ?? '—'}</p>
        <p className="text-[11px] text-muted-foreground">{fmtDateTime(it.startedAt)}{it.agent ? ` · ${it.agent.fullName}` : ''}</p>
      </div>
      {typeof it.durationSeconds === 'number' && it.type === 'call' && (
        <span className="tabular-nums text-muted-foreground">{fmtDuration(it.durationSeconds)}</span>
      )}
      <Badge variant={missed ? 'destructive' : 'secondary'} className="text-[10px] uppercase">{it.status}</Badge>
    </div>
  );
}

// ---------------- Modals ----------------

interface CaseInteraction {
  id: string;
  type: string;
  direction: string;
  status: string;
  startedAt: string;
  durationSeconds: number | null;
  fromNumber: string | null;
  toNumber: string | null;
  smsBody: string | null;
  recordingUrl: string | null;
  aiSummary: string | null;
  agent: { id: string; fullName: string } | null;
}
interface CaseNote {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; fullName: string } | null;
}
interface CaseDetail extends CaseItem {
  interactions: CaseInteraction[];
  notes: CaseNote[];
}

function ModalShell({ title, color, onClose, children }: { title: string; color: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between px-4 py-3 text-white ${color}`}>
          <p className="font-semibold">{title}</p>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[calc(90vh-3rem)] overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function FollowUpModal({ caseItem, onClose, onDone }: { caseItem: CaseItem; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslate();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const iso = new Date(`${date}T${time || '09:00'}:00`).toISOString();
      return apiClient.post(`/cases/${caseItem.id}/follow-up`, { followUpAt: iso, reason: reason || undefined });
    },
    onSuccess: () => { toast.success(t('cases.followUpScheduled')); onDone(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ModalShell title={t('cases.followUpTitle')} color="bg-amber-500" onClose={onClose}>
      <div className="space-y-3">
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{t('cases.followUpNote')}</p>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('cases.returnDate')}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('cases.timeOptional')}</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('cases.reason')}</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder={t('cases.reasonPlaceholder')} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
        </div>
        <Button className="w-full bg-amber-500 hover:bg-amber-600" disabled={!date || save.isPending} onClick={() => save.mutate()}>
          {t('cases.confirmFollowUp')}
        </Button>
      </div>
    </ModalShell>
  );
}

function ResolveModal({ caseItem, onClose, onDone }: { caseItem: CaseItem; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslate();
  const [outcome, setOutcome] = useState<'booked' | 'won' | 'lost'>('booked');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { outcome, note };
      if (outcome === 'booked') {
        body.visitAt = new Date(`${date}T${time || '09:00'}:00`).toISOString();
        body.visitConfirmed = confirmed;
      }
      return apiClient.post(`/cases/${caseItem.id}/resolve`, body);
    },
    onSuccess: () => { toast.success(t('cases.resolved')); onDone(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const needsVisit = outcome === 'booked';
  const canSave = note.trim().length > 0 && (!needsVisit || !!date) && !save.isPending;

  return (
    <ModalShell title={t('cases.resolveTitle')} color="bg-emerald-600" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('cases.outcomeLabel')}</label>
          <select value={outcome} onChange={(e) => setOutcome(e.target.value as never)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
            <option value="booked">{t('cases.outcome_booked')}</option>
            <option value="won">{t('cases.outcome_won')}</option>
            <option value="lost">{t('cases.outcome_lost')}</option>
          </select>
        </div>
        {needsVisit && (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('cases.visitDate')} *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('cases.visitTime')}</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              {t('cases.visitConfirmed')}
            </label>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('cases.resolutionNote')} *</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t('cases.resolutionNotePlaceholder')} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
        </div>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!canSave} onClick={() => save.mutate()}>
          {t('cases.confirmResolve')}
        </Button>
      </div>
    </ModalShell>
  );
}

const NEW_ORIGINS = ['inbound_call', 'outbound_call', 'sms', 'meta_ads', 'form', 'manual'] as const;

function NewCaseModal({ clients, onClose, onDone }: { clients: AssignedClient[]; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslate();
  const [subAccountId, setSubAccountId] = useState(clients[0]?.id ?? '');
  const [source, setSource] = useState<(typeof NEW_ORIGINS)[number]>('inbound_call');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  const save = useMutation({
    mutationFn: () =>
      apiClient.post('/cases', {
        subAccountId,
        source,
        name: name || undefined,
        phoneE164: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        note: note || undefined,
      }),
    onSuccess: () => { toast.success(t('cases.caseCreated')); onDone(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasContact = !!(name || phone || email || address);

  return (
    <ModalShell title={t('cases.newCaseTitle')} color="bg-primary" onClose={onClose}>
      <div className="space-y-3">
        <p className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">{t('cases.contactHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('cases.clientLinked')} *</label>
            <select value={subAccountId} onChange={(e) => setSubAccountId(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('cases.leadOrigin')} *</label>
            <select value={source} onChange={(e) => setSource(e.target.value as never)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
              {NEW_ORIGINS.map((o) => <option key={o} value={o}>{t(`cases.newOrigin_${o}`)}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <LabeledInput label={t('cases.fieldName')} value={name} onChange={setName} placeholder={t('cases.namePlaceholder')} />
          <LabeledInput label={t('cases.fieldPhone')} value={phone} onChange={setPhone} placeholder="+1 555 123 4567" />
          <LabeledInput label={t('cases.fieldEmail')} value={email} onChange={setEmail} placeholder="email@exemplo.com" />
          <LabeledInput label={t('cases.fieldAddress')} value={address} onChange={setAddress} placeholder={t('cases.addressPlaceholder')} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('cases.initialNote')}</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('cases.cancel')}</Button>
          <Button disabled={!subAccountId || !hasContact || save.isPending} onClick={() => save.mutate()}>
            <CheckCircle2 className="h-4 w-4" /> {t('cases.openCase')}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 h-9 text-sm" />
    </div>
  );
}

function firstOfThisMonth(): string {
  // Sem Date.now direto: usa o ano/mês atuais via toISOString do relógio do browser.
  const iso = new Date().toISOString(); // YYYY-MM-DDT...
  return `${iso.slice(0, 7)}-01`;
}

function CleanupModal({ agencyId, onClose, onDone }: { agencyId?: string; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslate();
  const [before, setBefore] = useState(firstOfThisMonth());
  const [confirmText, setConfirmText] = useState('');

  const run = useMutation({
    mutationFn: () =>
      apiClient.post<{ deleted: number }>('/cases/cleanup', {
        before: new Date(`${before}T00:00:00`).toISOString(),
        agencyId,
      }),
    onSuccess: (r) => {
      toast.success(t('cases.cleanupDone').replace('{n}', String(r.deleted)));
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ModalShell title={t('cases.cleanupTitle')} color="bg-red-600" onClose={onClose}>
      <div className="space-y-3">
        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">{t('cases.cleanupWarning')}</p>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('cases.cleanupBefore')}</label>
          <input type="date" value={before} onChange={(e) => setBefore(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t('cases.cleanupConfirmLabel')}</label>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="LIMPAR" className="mt-1 h-9 text-sm" />
        </div>
        <Button
          className="w-full bg-red-600 hover:bg-red-700"
          disabled={confirmText.trim().toUpperCase() !== 'LIMPAR' || !before || run.isPending}
          onClick={() => run.mutate()}
        >
          {t('cases.cleanupConfirm')}
        </Button>
      </div>
    </ModalShell>
  );
}

function CaseDetailModal({ caseId, onClose, onChanged }: { caseId: string; onClose: () => void; onChanged: () => void }) {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const { data: detail } = useQuery<CaseDetail>({
    queryKey: ['case', caseId],
    queryFn: () => apiClient.get(`/cases/${caseId}`),
  });

  const addNote = useMutation({
    mutationFn: () => apiClient.post(`/cases/${caseId}/notes`, { body: note }),
    onSuccess: () => {
      setNote('');
      qc.invalidateQueries({ queryKey: ['case', caseId] });
      onChanged();
      toast.success(t('cases.noteSaved'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Edição dos dados de contato.
  const [form, setForm] = useState({ name: '', phoneE164: '', email: '', address: '' });
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (detail) {
      setForm({
        name: detail.name ?? '',
        phoneE164: detail.phoneE164 ?? '',
        email: detail.email ?? '',
        address: detail.address ?? '',
      });
      setDirty(false);
    }
  }, [detail]);
  const setField = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const saveContact = useMutation({
    mutationFn: () => apiClient.patch(`/cases/${caseId}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case', caseId] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      onChanged();
      setDirty(false);
      toast.success(t('cases.contactSaved'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
          <p className="font-semibold">
            {t('cases.caseLabel')} #{caseId.slice(0, 8)}{detail?.subAccount ? ` | ${detail.subAccount.name}` : ''}
          </p>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto p-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t('cases.contactInfo')}</p>
            <div className="space-y-2">
              <LabeledInput label={t('cases.fieldName')} value={form.name} onChange={(v) => setField('name', v)} placeholder={t('cases.namePlaceholder')} />
              <LabeledInput label={t('cases.fieldPhone')} value={form.phoneE164} onChange={(v) => setField('phoneE164', v)} placeholder="+1 555 123 4567" />
              <LabeledInput label={t('cases.fieldEmail')} value={form.email} onChange={(v) => setField('email', v)} placeholder="email@exemplo.com" />
              <LabeledInput label={t('cases.fieldAddress')} value={form.address} onChange={(v) => setField('address', v)} placeholder={t('cases.addressPlaceholder')} />
              {dirty && (
                <Button size="sm" className="w-full" disabled={saveContact.isPending} onClick={() => saveContact.mutate()}>
                  {t('cases.saveContact')}
                </Button>
              )}
            </div>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase text-muted-foreground">{t('cases.fullRecords')}</p>
            <div className="max-h-64 space-y-1.5 overflow-auto">
              {detail?.interactions.length === 0 && <p className="text-xs text-muted-foreground">{t('cases.noRecords')}</p>}
              {detail?.interactions.map((i) => <InteractionRow key={i.id} it={i} />)}
            </div>
          </div>
          <div className="flex flex-col">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t('cases.notesTitle')}</p>
            <div className="mb-2 flex-1 space-y-2 overflow-auto">
              {detail?.notes.length === 0 && <p className="text-xs text-muted-foreground">{t('cases.noNotes')}</p>}
              {detail?.notes.map((n) => (
                <div key={n.id} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
                  <p className="text-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-amber-700">{n.author?.fullName ?? '—'} · {fmtDateTime(n.createdAt)}</p>
                </div>
              ))}
            </div>
            <div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('cases.addNotePlaceholder')} className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" />
              <Button size="sm" className="mt-1 w-full" disabled={!note.trim() || addNote.isPending} onClick={() => addNote.mutate()}>
                <Plus className="h-4 w-4" /> {t('cases.saveNote')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- helpers ----------------

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
