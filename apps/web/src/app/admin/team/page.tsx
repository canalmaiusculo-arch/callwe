'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Copy, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Agent {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'invited' | 'disabled';
  lastLoginAt: string | null;
  assignedSubAccounts: Array<{ id: string; name: string }>;
}

interface SubAccount {
  id: string;
  name: string;
  agency?: { id: string; name: string } | null;
}

export default function AdminTeamPage() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['all-agents'],
    queryFn: () => apiClient.get('/team/all'),
  });

  const { data: subs = [] } = useQuery<SubAccount[]>({
    queryKey: ['all-sub-accounts'],
    queryFn: () => apiClient.get('/sub-accounts'),
  });

  const invite = useMutation({
    mutationFn: (input: { email: string; fullName: string; subAccountIds: string[] }) =>
      apiClient.post<{ inviteUrl: string }>('/team/invite', { ...input, role: 'agent' }),
    onSuccess: (data) => {
      toast.success('Atendente convidado');
      setInviteUrl(data.inviteUrl);
      qc.invalidateQueries({ queryKey: ['all-agents'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiClient.del(`/team/${id}`),
    onSuccess: () => {
      toast.success('Atendente removido');
      qc.invalidateQueries({ queryKey: ['all-agents'] });
    },
  });

  function reset() {
    setEmail('');
    setFullName('');
    setSelectedSubs([]);
    setInviteUrl(null);
    setShowInvite(false);
  }

  function toggleSub(id: string) {
    setSelectedSubs((cur) => (cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id]));
  }

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Atendentes</h1>
          <p className="mt-1 text-muted-foreground">
            {agents.length} no time CallWe — atribuídos a clientes de várias agências
          </p>
        </div>
        <Button onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="h-4 w-4" /> Cadastrar atendente
        </Button>
      </header>

      {showInvite && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Novo atendente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inviteUrl ? (
              <>
                <p className="text-sm">Envie esse link ao atendente:</p>
                <div className="flex gap-2">
                  <Input value={inviteUrl} readOnly className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      toast.success('Copiado');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" onClick={reset}>
                  Fechar
                </Button>
              </>
            ) : (
              <>
                <Input placeholder="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <Input
                  type="email"
                  placeholder="email@callwe.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div>
                  <label className="text-sm font-medium">
                    Designar para clientes ({selectedSubs.length} selecionados)
                  </label>
                  <p className="mb-1 text-xs text-muted-foreground">
                    O atendente vai atender chamadas desses clientes
                  </p>
                  <div className="max-h-64 space-y-1 overflow-auto rounded-md border p-2">
                    {subs.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-muted/40"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubs.includes(s.id)}
                          onChange={() => toggleSub(s.id)}
                        />
                        <span className="flex-1 text-sm">{s.name}</span>
                        {s.agency && (
                          <span className="text-xs text-muted-foreground">{s.agency.name}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => invite.mutate({ email, fullName, subAccountIds: selectedSubs })}
                    disabled={!email || !fullName || invite.isPending}
                  >
                    {invite.isPending ? 'Criando...' : 'Gerar convite'}
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {agents.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Nenhum atendente cadastrado.
            </CardContent>
          </Card>
        )}
        {agents.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex-1">
                <p className="font-medium">{a.fullName}</p>
                <p className="text-xs text-muted-foreground">{a.email}</p>
                {a.assignedSubAccounts.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Atende: {a.assignedSubAccounts.map((s) => s.name).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={a.status === 'active' ? 'success' : a.status === 'invited' ? 'warning' : 'secondary'}
                >
                  {a.status}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(a.id)}>
                  <UserX className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
