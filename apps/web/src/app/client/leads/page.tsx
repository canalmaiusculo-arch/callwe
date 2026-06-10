'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';
import { Badge } from '@/components/ui/badge';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
type LeadSource = 'inbound_call' | 'outbound_call' | 'meta_ads' | 'sms' | 'manual' | 'import' | 'api' | 'form';

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
  form: 'Formulário',
};

export default function ClientLeadsPage() {
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['client-leads', subAccountId],
    queryFn: () => apiClient.get<Lead[]>('/leads'),
    enabled: !!subAccountId,
  });

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Meus leads</h1>
        <p className="mt-1 text-muted-foreground">{leads.length} leads</p>
      </header>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {!isLoading && leads.length === 0 && (
        <p className="text-muted-foreground">Nenhum lead ainda.</p>
      )}

      {leads.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Nome</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Origem</th>
                <th className="p-3">Status</th>
                <th className="p-3">Recebido</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3 font-medium">{l.name ?? '—'}</td>
                  <td className="p-3 font-mono text-xs">{l.phoneE164 ?? '—'}</td>
                  <td className="p-3 text-xs">{SOURCE_LABEL[l.source] ?? l.source}</td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABEL[l.status]}</Badge>
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
