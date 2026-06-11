'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HelpHint } from '@/components/help-hint';
import { useAdminViewStore } from '@/stores/admin-view-store';

interface Client {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'paused' | 'archived';
  plan: 'starter' | 'pro' | 'enterprise';
}

export default function ClientsPage() {
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
    mutationFn: (input: { name: string; slug: string }) => apiClient.post('/sub-accounts', input),
    onSuccess: () => {
      toast.success('Cliente criado');
      qc.invalidateQueries({ queryKey: ['agency-clients'] });
      setShowForm(false);
      setName('');
      setSlug('');
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
            <h1 className="text-3xl font-bold">Clientes</h1>
            <HelpHint topic="clientes" />
          </div>
          <p className="mt-1 text-muted-foreground">{clients.length} sob sua agência.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      </header>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Novo cliente</CardTitle>
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
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex.: Padaria do João" required />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Identificador (slug)</label>
                <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="padaria-do-joao" required />
              </div>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Criando...' : 'Criar'}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Depois de criar, abra o cliente para convidar o acesso dele e atribuir números.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {clients.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Nenhum cliente atribuído à sua agência ainda.
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
