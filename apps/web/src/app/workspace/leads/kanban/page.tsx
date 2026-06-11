'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, List } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/i18n/provider';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

const COLUMNS: { key: LeadStatus; labelKey: string; color: string }[] = [
  { key: 'new', labelKey: 'columnNew', color: 'border-blue-300 bg-blue-50' },
  { key: 'contacted', labelKey: 'columnContacted', color: 'border-purple-300 bg-purple-50' },
  { key: 'qualified', labelKey: 'columnQualified', color: 'border-amber-300 bg-amber-50' },
  { key: 'won', labelKey: 'columnWon', color: 'border-emerald-300 bg-emerald-50' },
  { key: 'lost', labelKey: 'columnLost', color: 'border-red-300 bg-red-50' },
];

interface Lead {
  id: string;
  name: string | null;
  phoneE164: string | null;
  email: string | null;
  status: LeadStatus;
  source: string;
  createdAt: string;
  owner: { id: string; fullName: string } | null;
}

export default function LeadsKanbanPage() {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ['leads-kanban'],
    queryFn: () => apiClient.get<Lead[]>('/leads?limit=500'),
    refetchInterval: 30_000,
  });

  const moveLead = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      apiClient.patch(`/leads/${id}`, { status }),
    onSuccess: () => {
      toast.success(t('leadsKanban.statusUpdated'));
      qc.invalidateQueries({ queryKey: ['leads-kanban'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('leadId', id);
  }

  function handleDrop(e: React.DragEvent, status: LeadStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData('leadId');
    if (!id) return;
    const lead = leads.find((l) => l.id === id);
    if (lead && lead.status !== status) {
      moveLead.mutate({ id, status });
    }
  }

  const byStatus = COLUMNS.reduce(
    (acc, c) => {
      acc[c.key] = leads.filter((l) => l.status === c.key);
      return acc;
    },
    {} as Record<LeadStatus, Lead[]>,
  );

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('leadsKanban.title')}</h1>
          <p className="mt-1 text-muted-foreground">{leads.length} {t('leadsKanban.subtitle')}</p>
        </div>
        <Link href={'/workspace/leads' as never}>
          <Button variant="outline">
            <List className="h-4 w-4" /> {t('leadsKanban.viewAsList')}
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.key)}
            className={`flex flex-col rounded-lg border-2 ${col.color} min-h-[400px]`}
          >
            <div className="border-b-2 border-inherit px-3 py-2">
              <h3 className="text-sm font-semibold">{t(`leadsKanban.${col.labelKey}`)}</h3>
              <p className="text-xs text-muted-foreground">{byStatus[col.key].length} {t('leadsKanban.leadsCount')}</p>
            </div>
            <div className="flex-1 space-y-2 p-2 overflow-auto">
              {byStatus[col.key].map((lead) => (
                <Card
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  className="cursor-move bg-white transition-shadow hover:shadow"
                >
                  <CardContent className="p-3">
                    <Link href={`/workspace/leads/${lead.id}` as never} className="block">
                      <p className="truncate text-sm font-medium">{lead.name ?? t('leadsKanban.noName')}</p>
                      {lead.phoneE164 && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span className="font-mono">{lead.phoneE164}</span>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                        {lead.owner && ` · ${lead.owner.fullName}`}
                      </p>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
