'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'invited' | 'disabled';
  lastLoginAt: string | null;
  memberships: Array<{
    id: string;
    role: string;
    subAccountId: string | null;
    subAccountName: string | null;
  }>;
}

interface SubAccount {
  id: string;
  name: string;
  slug: string;
}

export default function TeamPage() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [inviteRole, setInviteRole] = useState<'agent' | 'client_viewer'>('agent');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const { data: team = [] } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: () => apiClient.get('/team'),
  });

  const { data: subAccounts = [] } = useQuery<SubAccount[]>({
    queryKey: ['agency-clients'],
    queryFn: () => apiClient.get('/sub-accounts'),
  });

  const invite = useMutation({
    mutationFn: (input: { email: string; fullName: string; subAccountIds: string[]; role: 'agent' | 'client_viewer' }) =>
      apiClient.post<{ inviteUrl: string }>('/team/invite', input),
    onSuccess: (data) => {
      toast.success('Convite criado');
      setInviteUrl(data.inviteUrl);
      setEmail('');
      setFullName('');
      setSelectedSubs([]);
      qc.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => apiClient.del(`/team/${userId}`),
    onSuccess: () => {
      toast.success('Usuário removido');
      qc.invalidateQueries({ queryKey: ['team'] });
    },
  });

  function copyInviteUrl() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('Link copiado');
  }

  function toggleSub(id: string) {
    setSelectedSubs((cur) => (cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id]));
  }

  const agents = team.filter((t) => t.memberships.some((m) => m.role === 'agent'));
  const admins = team.filter((t) => t.memberships.some((m) => m.role.includes('admin')));

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Time alocado</h1>
        <p className="mt-1 text-muted-foreground">
          {team.length} pessoas atendendo seus clientes. Para cadastrar novos atendentes, fale com a CallWe.
        </p>
      </header>

      {false && showInvite && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Novo convite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inviteUrl ? (
              <div>
                <p className="text-sm">
                  Link de convite gerado. Envie para o atendente:
                </p>
                <div className="mt-2 flex gap-2">
                  <Input value={inviteUrl ?? ''} readOnly className="font-mono text-xs" />
                  <Button variant="outline" onClick={copyInviteUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="mt-3" variant="outline" onClick={() => { setInviteUrl(null); setShowInvite(false); }}>
                  Fechar
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">Tipo de acesso</label>
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteRole('agent')}
                      className={`flex-1 rounded-md border p-2 text-sm ${inviteRole === 'agent' ? 'border-primary bg-primary/10' : ''}`}
                    >
                      Atendente (faz/atende chamadas)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteRole('client_viewer')}
                      className={`flex-1 rounded-md border p-2 text-sm ${inviteRole === 'client_viewer' ? 'border-primary bg-primary/10' : ''}`}
                    >
                      Cliente final (só visualização)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome completo</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Pedro da Cruz" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pedro@empresa.com" />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Atende quais clientes? ({selectedSubs.length} selecionado{selectedSubs.length !== 1 ? 's' : ''})
                  </label>
                  <div className="mt-1 max-h-48 space-y-1 overflow-auto rounded-md border p-2">
                    {subAccounts.map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-muted/40">
                        <input
                          type="checkbox"
                          checked={selectedSubs.includes(s.id)}
                          onChange={() => toggleSub(s.id)}
                        />
                        <span className="text-sm">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => invite.mutate({ email, fullName, subAccountIds: selectedSubs, role: inviteRole })}
                    disabled={!email || !fullName || invite.isPending}
                  >
                    {invite.isPending ? 'Criando...' : 'Gerar convite'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowInvite(false)}>
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {admins.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium uppercase text-muted-foreground">Admins</h2>
          <div className="space-y-2">
            {admins.map((u) => <UserRow key={u.id} user={u} onRemove={() => remove.mutate(u.id)} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase text-muted-foreground">Atendentes</h2>
        <div className="space-y-2">
          {agents.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Nenhum atendente convidado ainda.
              </CardContent>
            </Card>
          )}
          {agents.map((u) => <UserRow key={u.id} user={u} onRemove={() => remove.mutate(u.id)} />)}
        </div>
      </section>
    </div>
  );
}

function UserRow({ user, onRemove }: { user: TeamMember; onRemove: () => void }) {
  const subNames = user.memberships
    .filter((m) => m.subAccountName)
    .map((m) => m.subAccountName)
    .join(', ');

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex-1">
          <p className="font-medium">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          {subNames && <p className="mt-1 text-xs text-muted-foreground">Atende: {subNames}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user.status === 'active' ? 'success' : user.status === 'invited' ? 'warning' : 'secondary'}>
            {user.status}
          </Badge>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <UserX className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
