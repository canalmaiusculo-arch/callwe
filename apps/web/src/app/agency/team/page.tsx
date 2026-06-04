'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, UserX, Pencil, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAdminViewStore } from '@/stores/admin-view-store';

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
  const viewAsAgencyId = useAdminViewStore((s) => s.viewAsAgencyId);

  const { data: team = [] } = useQuery<TeamMember[]>({
    queryKey: ['team', viewAsAgencyId],
    queryFn: () => apiClient.get(viewAsAgencyId ? `/team?agencyId=${viewAsAgencyId}` : '/team'),
  });

  const { data: subAccounts = [] } = useQuery<SubAccount[]>({
    queryKey: ['agency-clients', viewAsAgencyId],
    queryFn: () =>
      apiClient.get(viewAsAgencyId ? `/sub-accounts?agencyId=${viewAsAgencyId}` : '/sub-accounts'),
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
            {admins.map((u) => (
              <UserRow key={u.id} user={u} subAccounts={subAccounts} onRemove={() => remove.mutate(u.id)} />
            ))}
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
          {agents.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              subAccounts={subAccounts}
              onRemove={() => remove.mutate(u.id)}
              isAgent
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function UserRow({
  user,
  subAccounts,
  onRemove,
  isAgent,
}: {
  user: TeamMember;
  subAccounts: SubAccount[];
  onRemove: () => void;
  isAgent?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const subNames = user.memberships
    .filter((m) => m.subAccountName)
    .map((m) => m.subAccountName)
    .join(', ');

  return (
    <>
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
            {isAgent && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} title="Editar clientes atendidos">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onRemove} title="Remover do time">
              <UserX className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      {editing && (
        <EditAgentSubAccounts user={user} subAccounts={subAccounts} onClose={() => setEditing(false)} />
      )}
    </>
  );
}

function EditAgentSubAccounts({
  user,
  subAccounts,
  onClose,
}: {
  user: TeamMember;
  subAccounts: SubAccount[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const initial = user.memberships
    .filter((m) => m.subAccountId)
    .map((m) => m.subAccountId!) as string[];
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [filter, setFilter] = useState('');

  const visible = subAccounts.filter((s) =>
    !filter ? true : s.name.toLowerCase().includes(filter.toLowerCase()),
  );

  const sync = useMutation({
    mutationFn: () =>
      apiClient.post(`/team/${user.id}/sub-accounts`, { subAccountIds: Array.from(selected) }),
    onSuccess: (r: unknown) => {
      const res = r as { added: number; removed: number; total: number };
      toast.success(`Atualizado: +${res.added} / −${res.removed} → ${res.total} clientes`);
      qc.invalidateQueries({ queryKey: ['team'] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleAll = () => {
    if (selected.size === visible.length) setSelected(new Set());
    else setSelected(new Set(visible.map((s) => s.id)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="max-h-[80vh] w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Clientes atendidos por {user.fullName}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{selected.size} de {subAccounts.length} selecionados</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex max-h-[60vh] flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2">
            <Input placeholder="Filtrar clientes..." value={filter} onChange={(e) => setFilter(e.target.value)} />
            <Button size="sm" variant="outline" onClick={toggleAll}>
              {selected.size === visible.length && visible.length > 0 ? 'Limpar' : 'Todos'}
            </Button>
          </div>
          <div className="flex-1 space-y-0.5 overflow-auto rounded-md border p-2">
            {visible.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhum cliente bate com o filtro.</p>
            )}
            {visible.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => {
                    setSelected((cur) => {
                      const next = new Set(cur);
                      if (next.has(s.id)) next.delete(s.id);
                      else next.add(s.id);
                      return next;
                    });
                  }}
                />
                <span className="text-sm">{s.name}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
