'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Phone, MessageSquare, Voicemail, FormInput } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecordingPlayer } from '@/components/recording-player';
import { LeadCustomFields, leadHasCustomFields } from '@/components/lead-custom-fields';
import { useTenantStore } from '@/stores/tenant-store';
import { useTranslate } from '@/i18n/provider';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  new: 'default', contacted: 'secondary', qualified: 'warning', won: 'success', lost: 'destructive',
};
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone, sms: MessageSquare, voicemail: Voicemail, meta_form: FormInput,
};
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
}

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ClientLeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { t } = useTranslate();
  const { leadId } = use(params);
  const subAccountId = useTenantStore((s) => s.subAccountId);

  const STATUS_LABEL: Record<string, string> = {
    new: t('clientLeadDetail.statusNew'),
    contacted: t('clientLeadDetail.statusContacted'),
    qualified: t('clientLeadDetail.statusQualified'),
    won: t('clientLeadDetail.statusWon'),
    lost: t('clientLeadDetail.statusLost'),
  };
  const SOURCE_LABEL: Record<string, string> = {
    inbound_call: t('clientLeadDetail.sourceInboundCall'),
    outbound_call: t('clientLeadDetail.sourceOutboundCall'),
    meta_ads: t('clientLeadDetail.sourceMetaAds'),
    sms: t('clientLeadDetail.sourceSms'),
    manual: t('clientLeadDetail.sourceManual'),
    import: t('clientLeadDetail.sourceImport'),
    api: t('clientLeadDetail.sourceApi'),
    form: t('clientLeadDetail.sourceForm'),
  };

  const { data: lead, isLoading } = useQuery<LeadDetail>({
    queryKey: ['client-lead', leadId, subAccountId],
    queryFn: () => apiClient.get(`/leads/${leadId}`),
    enabled: !!subAccountId,
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">{t('clientLeadDetail.loading')}</div>;
  if (!lead) return <div className="p-8">{t('clientLeadDetail.notFound')}</div>;

  const hasFields = leadHasCustomFields(lead.customFields);

  return (
    <div className="p-4 md:p-8">
      <Link href={'/client/leads' as never} className="text-sm text-muted-foreground hover:underline">
        ← {t('clientLeadDetail.backToLeads')}
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{lead.name ?? t('clientLeadDetail.unnamedLead')}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {lead.phoneE164 && <span className="font-mono">{lead.phoneE164}</span>}
            {lead.email && <span>· {lead.email}</span>}
            <span>· {SOURCE_LABEL[lead.source] ?? lead.source}</span>
            <span>· {new Date(lead.createdAt).toLocaleString('pt-BR')}</span>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[lead.status]}>{STATUS_LABEL[lead.status] ?? lead.status}</Badge>
      </div>

      <div className="mt-6 max-w-4xl space-y-4">
        {(hasFields || lead.tags.length > 0) && (
          <Card>
            <CardHeader><CardTitle className="text-base">{t('clientLeadDetail.leadInfo')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lead.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                </div>
              )}
              <LeadCustomFields customFields={lead.customFields} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">{t('clientLeadDetail.history')} ({lead.interactions.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lead.interactions.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('clientLeadDetail.noInteractions')}</p>
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
                          ? i.direction === 'inbound'
                            ? t('clientLeadDetail.callInbound')
                            : t('clientLeadDetail.callOutbound')
                          : i.type === 'sms'
                            ? i.direction === 'inbound'
                              ? t('clientLeadDetail.smsInbound')
                              : t('clientLeadDetail.smsOutbound')
                            : i.type === 'voicemail'
                              ? t('clientLeadDetail.voicemail')
                              : t('clientLeadDetail.form')}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(i.startedAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {i.durationSeconds != null && <span>{t('clientLeadDetail.duration')}: {fmtDur(i.durationSeconds)}</span>}
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
    </div>
  );
}
