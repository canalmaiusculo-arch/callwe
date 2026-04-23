'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, UserPlus, Pencil, Trash2, ExternalLink, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTenantStore } from '@/stores/tenant-store';

interface AgencyDetail {
  id: string;
  name: string;
  slug: string;
  billingEmail: string;
  status: 'active' | 'suspended';
  subAccounts: Array<{ id: string; name: string; status: string }>;
  memberships: Array<{
    id: string;
    role: string;
    user: { id: string; email: string; fullName: string; status: string };
  }>;
}

export default function AgencyDetailPage({ params }: { params: Promise<{ agencyId: string }> }) {
  const { agencyId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const setTenant = useTenantStore((s) => s.setTenant);
  const [showInvite, setShowInvite] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const { data: agency } = useQuery<AgencyDetail>({
    queryKey: ['agency', agencyId],
    queryFn: () => apiClient.get<AgencyDetail>(`/agencies/${agencyId}`),
  });

  const invite = useMutation({
    mutationFn: (input: { email: string; fullName: string }) =>
      apiClient.post<{ inviteUrl: string }>(`/agencies/${agencyId}/invite-admin`, input),
    onSuccess: (data) => {
      toast.success('Convite criado');
      setInviteUrl(data.inviteUrl);
      qc.invalidateQueries({ queryKey: ['agency', agencyId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rename = useMutation({
    mutationFn: (newName: string) => apiClient.patch(`/agencies/${agencyId}`, { name: newName }),
    onSuccess: () => {
      toast.success('Renomeada');
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['agency', agencyId] });
      qc.invalidateQueries({ queryKey: ['agencies'] });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: () =>
      apiClient.patch(`/agencies/${agencyId}`, {
        status: agency?.status === 'active' ? 'suspended' : 'active',
      }),
    onSuccess: () => {
      toast.success('Status alterado');
      qc.invalidateQueries({ queryKey: ['agency', agencyId] });
      qc.invalidateQueries({ queryKey: ['agencies'] });
    },
  });

  const deleteAgency = useMutation({
    mutationFn: () => apiClient.del(`/agencies/${agencyId}`),
    onSuccess: () => {
      toast.success('Agência arquivada');
      router.push('/admin');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteClient = useMutation({
    mutationFn: (id: string) => apiClient.del(`/sub-accounts/${id}`),
    onSuccess: () => {
      toast.success('Cliente arquivado');
      qc.invalidateQueries({ queryKey: ['agency', agencyId] });
    },
  });

  function enterAgencyPanel() {
    if (typeof window !== 'undefined' && agency) {
      localStorage.setItem(
        'callwe-admin-view-agency',
        JSON.stringify({ id: agency.id, name: agency.name }),
      );
      router.push('/agency');
    }
  }

  function openSubAccount(id: string, name: string) {
    setTenant(id, name);
    router.push('/workspace');
  }

  if (!agency) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-8">
      <Link href={'/admin' as never} className="text-sm text-muted-foreground hover:underline">
        ← Agências
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="max-w-md text-2xl font-bold"
                autoFocus
              />
              <Button size="sm" onClick={() => rename.mutate(editName)} disabled={!editName || rename.isPending}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{agency.name}</h1>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditName(agency.name);
                  setEditing(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {agency.slug} · {agency.billingEmail}
          </p>
          <Badge variant={agency.status === 'active' ? 'success' : 'secondary'} className="mt-2">
            {agency.status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="default" onClick={enterAgencyPanel}>
            <ExternalLink className="h-4 w-4" /> Abrir painel da agência
          </Button>
          <Button variant="outline" onClick={() => toggleStatus.mutate()}>
            {agency.status === 'active' ? 'Suspender' : 'Reativar'}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(`Arquivar a agência "${agency.name}"? Todos os clientes dela ficarão inativos.`)) {
                deleteAgency.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Arquivar
          </Button>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Gestores</CardTitle>
            <Button size="sm" onClick={() => { setShowInvite(!showInvite); setInviteUrl(null); }}>
              <UserPlus className="h-4 w-4" /> Convidar
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {showInvite && (
              <Card className="mb-3 bg-muted/30">
                <CardContent className="space-y-2 pt-4">
                  {inviteUrl ? (
                    <>
                      <p className="text-xs text-muted-foreground">Link de convite:</p>
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
                      <Button variant="outline" size="sm" onClick={() => { setInviteUrl(null); setShowInvite(false); }}>
                        Fechar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input placeholder="Nome do gestor" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                      <Input type="email" placeholder="Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                      <Button
                        size="sm"
                        onClick={() => invite.mutate({ email: adminEmail, fullName: adminName })}
                        disabled={!adminEmail || !adminName || invite.isPending}
                      >
                        {invite.isPending ? 'Criando...' : 'Gerar convite'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {agency.memberships.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem gestores. Convide o primeiro.</p>
            )}
            {agency.memberships.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{m.user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <Badge
                  variant={m.user.status === 'active' ? 'success' : m.user.status === 'invited' ? 'warning' : 'secondary'}
                >
                  {m.user.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Clientes ({agency.subAccounts.filter((s) => s.status !== 'archived').length})</CardTitle>
            <Link href={`/admin/agencies/${agencyId}/new-client` as never}>
              <Button size="sm">
                <Plus className="h-4 w-4" /> Novo cliente
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {agency.subAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground">Essa agência ainda não tem clientes.</p>
            )}
            {agency.subAccounts.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/30"
              >
                <button
                  onClick={() => openSubAccount(s.id, s.name)}
                  className="flex-1 text-left"
                >
                  <p className="text-sm font-medium">{s.name}</p>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Arquivar cliente "${s.name}"?`)) deleteClient.mutate(s.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
