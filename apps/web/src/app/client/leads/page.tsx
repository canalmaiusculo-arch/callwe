'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';
import { Badge } from '@/components/ui/badge';
import { HelpHint } from '@/components/help-hint';
import { useTranslate } from '@/i18n/provider';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
type LeadSource = 'inbound_call' | 'outbound_call' | 'meta_ads' | 'sms' | 'manual' | 'import' | 'api' | 'form' | 'messenger' | 'thumbtack';

interface Lead {
  id: string;
  name: string | null;
  phoneE164: string | null;
  email: string | null;
  status: LeadStatus;
  source: LeadSource;
  createdAt: string;
}

const STATUS_VARIANT: Record<LeadStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  new: 'default',
  contacted: 'secondary',
  qualified: 'warning',
  won: 'success',
  lost: 'destructive',
};
const STATUS_LABEL_KEY: Record<LeadStatus, string> = {
  new: 'clientLeads.statusNew',
  contacted: 'clientLeads.statusContacted',
  qualified: 'clientLeads.statusQualified',
  won: 'clientLeads.statusWon',
  lost: 'clientLeads.statusLost',
};
const SOURCE_LABEL_KEY: Record<LeadSource, string> = {
  inbound_call: 'clientLeads.sourceInboundCall',
  outbound_call: 'clientLeads.sourceOutboundCall',
  meta_ads: 'clientLeads.sourceMetaAds',
  sms: 'clientLeads.sourceSms',
  manual: 'clientLeads.sourceManual',
  import: 'clientLeads.sourceImport',
  api: 'clientLeads.sourceApi',
  form: 'clientLeads.sourceForm',
  messenger: 'clientLeads.sourceMessenger',
  thumbtack: 'clientLeads.sourceThumbtack',
};

export default function ClientLeadsPage() {
  const { t } = useTranslate();
  const router = useRouter();
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['client-leads', subAccountId],
    queryFn: () => apiClient.get<Lead[]>('/leads?limit=500'),
    enabled: !!subAccountId,
  });

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold md:text-3xl">{t('clientLeads.title')}</h1>
          <HelpHint topic="leads" />
        </div>
        <p className="mt-1 text-muted-foreground">{leads.length} {t('clientLeads.leadsCount')}</p>
      </header>

      {isLoading && <p className="text-muted-foreground">{t('clientLeads.loading')}</p>}
      {!isLoading && leads.length === 0 && (
        <p className="text-muted-foreground">{t('clientLeads.empty')}</p>
      )}

      {/* Mobile: cards (sem scroll horizontal) */}
      {leads.length > 0 && (
        <div className="space-y-2 md:hidden">
          {leads.map((l) => (
            <button
              key={l.id}
              onClick={() => router.push(`/client/leads/${l.id}`)}
              className="flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left active:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.name ?? '—'}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{l.phoneE164 ?? '—'}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {SOURCE_LABEL_KEY[l.source] ? t(SOURCE_LABEL_KEY[l.source]) : l.source} ·{' '}
                  {new Date(l.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[l.status]} className="shrink-0">{t(STATUS_LABEL_KEY[l.status])}</Badge>
            </button>
          ))}
        </div>
      )}

      {/* Desktop: tabela */}
      {leads.length > 0 && (
        <div className="hidden overflow-x-auto rounded-lg border md:block">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">{t('clientLeads.colName')}</th>
                <th className="p-3">{t('clientLeads.colPhone')}</th>
                <th className="p-3">{t('clientLeads.colSource')}</th>
                <th className="p-3">{t('clientLeads.colStatus')}</th>
                <th className="p-3">{t('clientLeads.colReceived')}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => router.push(`/client/leads/${l.id}`)}
                  className="cursor-pointer border-t hover:bg-muted/30"
                >
                  <td className="p-3 font-medium">{l.name ?? '—'}</td>
                  <td className="p-3 font-mono text-xs">{l.phoneE164 ?? '—'}</td>
                  <td className="p-3 text-xs">{SOURCE_LABEL_KEY[l.source] ? t(SOURCE_LABEL_KEY[l.source]) : l.source}</td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANT[l.status]}>{t(STATUS_LABEL_KEY[l.status])}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(l.createdAt).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
