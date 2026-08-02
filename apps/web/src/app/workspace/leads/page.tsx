'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Download, Filter, LayoutGrid } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpHint } from '@/components/help-hint';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { useTranslate } from '@/i18n/provider';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
type LeadSource = 'inbound_call' | 'outbound_call' | 'meta_ads' | 'sms' | 'manual' | 'import' | 'api' | 'form';

interface Lead {
  id: string;
  name: string | null;
  phoneE164: string | null;
  email: string | null;
  status: LeadStatus;
  source: LeadSource;
  tags: string[];
  createdAt: string;
  lastContactAt: string | null;
  owner: { id: string; fullName: string } | null;
}

const STATUS_VARIANT: Record<LeadStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  new: 'default',
  contacted: 'secondary',
  qualified: 'warning',
  won: 'success',
  lost: 'destructive',
};

type TranslateFn = (key: string) => string;

function statusLabels(t: TranslateFn): Record<LeadStatus, string> {
  return {
    new: t('wsLeads.statusNew'),
    contacted: t('wsLeads.statusContacted'),
    qualified: t('wsLeads.statusQualified'),
    won: t('wsLeads.statusWon'),
    lost: t('wsLeads.statusLost'),
  };
}

function sourceLabels(t: TranslateFn): Record<LeadSource, string> {
  return {
    inbound_call: t('wsLeads.sourceInboundCall'),
    outbound_call: t('wsLeads.sourceOutboundCall'),
    meta_ads: 'Meta Ads',
    sms: 'SMS',
    manual: t('wsLeads.sourceManual'),
    import: t('wsLeads.sourceImport'),
    api: 'API',
    form: t('wsLeads.sourceForm'),
  };
}

export default function LeadsPage() {
  const { t } = useTranslate();
  const STATUS_LABEL = statusLabels(t);
  const SOURCE_LABEL = sourceLabels(t);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const token = useAuthStore((s) => s.accessToken);
  const subAccountId = useTenantStore((s) => s.subAccountId);

  const query = new URLSearchParams();
  query.set('limit', '500');
  if (search) query.set('search', search);
  if (status) query.set('status', status);
  if (source) query.set('source', source);
  if (from) query.set('from', new Date(from).toISOString());
  if (to) query.set('to', new Date(to).toISOString());

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads', subAccountId, query.toString()],
    queryFn: () => apiClient.get<Lead[]>(`/leads?${query.toString()}`),
    enabled: !!subAccountId,
  });

  function handleExport() {
    if (!token || !subAccountId) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/leads/export.csv?${query.toString()}`;
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Sub-Account-Id': subAccountId,
      },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      });
  }

  function clearFilters() {
    setSearch('');
    setStatus('');
    setSource('');
    setFrom('');
    setTo('');
  }

  const hasFilters = !!(search || status || source || from || to);

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold md:text-3xl">{t('wsLeads.title')}</h1>
            <HelpHint topic="leads" />
          </div>
          <p className="mt-1 text-muted-foreground">{leads.length} {t('wsLeads.countLabel')} {hasFilters && t('wsLeads.filteredSuffix')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={'/workspace/leads/kanban' as never}>
            <Button variant="outline">
              <LayoutGrid className="h-4 w-4" /> {t('wsLeads.kanban')}
            </Button>
          </Link>
          <Button variant="outline" onClick={handleExport} disabled={leads.length === 0}>
            <Download className="h-4 w-4" /> {t('wsLeads.exportCsv')}
          </Button>
          <Button>{t('wsLeads.newLead')}</Button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder={t('wsLeads.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus | '')}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">{t('wsLeads.allStatuses')}</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" /> {showFilters ? t('wsLeads.fewerFilters') : t('wsLeads.moreFilters')}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t('wsLeads.clearFilters')}
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="mb-4 grid grid-cols-3 gap-3 rounded-md border bg-muted/20 p-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('wsLeads.source')}</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource | '')}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">{t('wsLeads.allSources')}</option>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('wsLeads.dateFrom')}</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('wsLeads.dateTo')}</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">{t('wsLeads.colName')}</th>
              <th className="p-3">{t('wsLeads.colPhone')}</th>
              <th className="p-3">{t('wsLeads.colSource')}</th>
              <th className="p-3">{t('wsLeads.colAgent')}</th>
              <th className="p-3">{t('wsLeads.colStatus')}</th>
              <th className="p-3">{t('wsLeads.colCreated')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t('wsLeads.loading')}</td></tr>
            )}
            {!isLoading && leads.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t('wsLeads.empty')}</td></tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b hover:bg-muted/20">
                <td className="p-3">
                  <Link href={`/workspace/leads/${lead.id}` as never} className="font-medium hover:underline">
                    {lead.name ?? '—'}
                  </Link>
                </td>
                <td className="p-3 font-mono text-xs">{lead.phoneE164 ?? '—'}</td>
                <td className="p-3 text-xs">{SOURCE_LABEL[lead.source]}</td>
                <td className="p-3 text-xs">{lead.owner?.fullName ?? '—'}</td>
                <td className="p-3">
                  <Badge variant={STATUS_VARIANT[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
