'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HelpHint } from '@/components/help-hint';
import { useAdminViewStore } from '@/stores/admin-view-store';
import { useTranslate } from '@/i18n/provider';

interface Client {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'paused' | 'archived';
  plan: 'starter' | 'pro' | 'enterprise';
}

export default function ClientsPage() {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const viewAsAgencyId = useAdminViewStore((s) => s.viewAsAgencyId);
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['agency-clients', viewAsAgencyId],
    queryFn: () => apiClient.get(viewAsAgencyId ? `/sub-accounts?agencyId=${viewAsAgencyId}` : '/sub-accounts'),
  });

  const create = useMutation({
    mutationFn: (input: { name: string; slug: string }) =>
      apiClient.post('/sub-accounts', viewAsAgencyId ? { ...input, agencyId: viewAsAgencyId } : input),
    onSuccess: () => {
      toast.success(t('agencyClients.toastCreated'));
      qc.invalidateQueries({ queryKey: ['agency-clients'] });
      setShowForm(false);
      setName('');
      setSlug('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const archive = useMutation({
    mutationFn: (id: string) => apiClient.del(`/sub-accounts/${id}`),
    onSuccess: () => {
      toast.success(t('agencyClients.toastArchived'));
      qc.invalidateQueries({ queryKey: ['agency-clients'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  }

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold md:text-3xl">{t('agencyClients.title')}</h1>
            <HelpHint topic="clientes" />
          </div>
          <p className="mt-1 text-muted-foreground">{t('agencyClients.subtitle').replace('{count}', String(clients.length))}</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> {t('agencyClients.newClient')}
        </Button>
      </header>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">{t('agencyClients.newClient')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim() || !slug.trim()) return;
                create.mutate({ name: name.trim(), slug: slug.trim() });
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">{t('agencyClients.nameLabel')}</label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder={t('agencyClients.namePlaceholder')} required />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">{t('agencyClients.slugLabel')}</label>
                <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="padaria-do-joao" required />
              </div>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? t('agencyClients.creating') : t('agencyClients.create')}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('agencyClients.formHint')}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {clients.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {t('agencyClients.empty')}
            </CardContent>
          </Card>
        )}
        {clients.map((c) => (
          <Link key={c.id} href={`/agency/clients/${c.id}` as never}>
            <Card className="transition-colors hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                <div>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === 'active' ? 'success' : 'secondary'}>{c.status}</Badge>
                  <Badge variant="outline">{c.plan}</Badge>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (window.confirm(t('agencyClients.confirmArchive').replace('{name}', c.name))) {
                        archive.mutate(c.id);
                      }
                    }}
                    disabled={archive.isPending}
                    title={t('agencyClients.archive')}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
