'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
type LeadSource = 'inbound_call' | 'outbound_call' | 'meta_ads' | 'sms' | 'manual' | 'import' | 'api';

interface Lead {
  id: string;
  name: string | null;
  phoneE164: string | null;
  email: string | null;
  status: LeadStatus;
  source: LeadSource;
  createdAt: string;
  lastContactAt: string | null;
}

const STATUS_VARIANT: Record<LeadStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  new: 'default',
  contacted: 'secondary',
  qualified: 'warning',
  won: 'success',
  lost: 'destructive',
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  won: 'Ganho',
  lost: 'Perdido',
};

const SOURCE_LABEL: Record<LeadSource, string> = {
  inbound_call: 'Chamada entrante',
  outbound_call: 'Chamada saída',
  meta_ads: 'Meta Ads',
  sms: 'SMS',
  manual: 'Manual',
  import: 'Importação',
  api: 'API',
};

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads', { search, status }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const qs = params.toString();
      return apiClient.get<Lead[]>(`/leads${qs ? `?${qs}` : ''}`);
    },
  });

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="mt-1 text-muted-foreground">{leads.length} leads</p>
        </div>
        <Button>Novo lead</Button>
      </header>

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Buscar por nome, telefone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus | '')}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">Origem</th>
              <th className="p-3">Status</th>
              <th className="p-3">Criado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && leads.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  Nenhum lead.
                </td>
              </tr>
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
