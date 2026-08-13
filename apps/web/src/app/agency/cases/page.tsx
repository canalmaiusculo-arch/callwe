'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { CasesPanel } from '@/components/agent/cases-panel';
import { useAdminViewStore } from '@/stores/admin-view-store';
import { useTranslate } from '@/i18n/provider';

interface Client {
  id: string;
  name: string;
}

export default function AgencyCasesPage() {
  const { t } = useTranslate();
  const viewAsAgencyId = useAdminViewStore((s) => s.viewAsAgencyId);
  const [clientFilter, setClientFilter] = useState<string>('');

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['agency-clients', viewAsAgencyId],
    queryFn: () =>
      apiClient.get(viewAsAgencyId ? `/sub-accounts?agencyId=${viewAsAgencyId}` : '/sub-accounts'),
  });

  return (
    <div className="p-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold md:text-3xl">{t('cases.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('cases.agencySubtitle')}</p>
      </header>

      <div className="mb-4 max-w-xs">
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        >
          <option value="">{t('cases.allClients')}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <CasesPanel
        agencyId={viewAsAgencyId ?? undefined}
        filterSubAccountId={clientFilter || null}
        clients={clients}
      />
    </div>
  );
}
