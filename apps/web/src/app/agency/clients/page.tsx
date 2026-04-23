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

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['agency-clients'],
    queryFn: () => apiClient.get('/sub-accounts'),
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
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="mt-1 text-muted-foreground">
          {clients.length} sob sua agência. Para cadastrar um novo cliente, fale com a CallWe.
        </p>
      </header>

      {/* Cadastro de novos clientes feito pelo super_admin */}

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
