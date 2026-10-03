'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, UserPlus, Pencil, Trash2, ExternalLink, Check, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTenantStore } from '@/stores/tenant-store';
import { ClientAccessCreated } from '@/components/client-access-created';
import { useTranslate } from '@/i18n/provider';

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
  const { t } = useTranslate();
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
      toast.success(t('adminAgencyDetail.toastInviteCreated'));
      setInviteUrl(data.inviteUrl);
      qc.invalidateQueries({ queryKey: ['agency', agencyId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rename = useMutation({
    mutationFn: (newName: string) => apiClient.patch(`/agencies/${agencyId}`, { name: newName }),
    onSuccess: () => {
      toast.success(t('adminAgencyDetail.toastRenamed'));
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
      toast.success(t('adminAgencyDetail.toastStatusChanged'));
      qc.invalidateQueries({ queryKey: ['agency', agencyId] });
      qc.invalidateQueries({ queryKey: ['agencies'] });
    },
  });

  const deleteAgency = useMutation({
    mutationFn: () => apiClient.del(`/agencies/${agencyId}`),
    onSuccess: () => {
      toast.success(t('adminAgencyDetail.toastAgencyArchived'));
      router.push('/admin');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteClient = useMutation({
    mutationFn: (id: string) => apiClient.del(`/sub-accounts/${id}`),
    onSuccess: () => {
      toast.success(t('adminAgencyDetail.toastClientArchived'));
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

  if (!agency) return <div className="p-8 text-muted-foreground">{t('adminAgencyDetail.loading')}</div>;

  return (
    <div className="p-8">
      <Link href={'/admin' as never} className="text-sm text-muted-foreground hover:underline">
        ← {t('adminAgencyDetail.backToAgencies')}
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
                {t('adminAgencyDetail.cancel')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold md:text-3xl">{agency.name}</h1>
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
            <ExternalLink className="h-4 w-4" /> {t('adminAgencyDetail.openAgencyPanel')}
          </Button>
          <Button variant="outline" onClick={() => toggleStatus.mutate()}>
            {agency.status === 'active' ? t('adminAgencyDetail.suspend') : t('adminAgencyDetail.reactivate')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(t('adminAgencyDetail.confirmArchiveAgency').replace('{name}', agency.name))) {
                deleteAgency.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> {t('adminAgencyDetail.archive')}
          </Button>
        </div>
      </header>

      <AgencyAccessCard agencyId={agencyId} />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('adminAgencyDetail.managers')}</CardTitle>
            <Button size="sm" onClick={() => { setShowInvite(!showInvite); setInviteUrl(null); }}>
              <UserPlus className="h-4 w-4" /> {t('adminAgencyDetail.invite')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {showInvite && (
              <Card className="mb-3 bg-muted/30">
                <CardContent className="space-y-2 pt-4">
                  {inviteUrl ? (
                    <>
                      <p className="text-xs text-muted-foreground">{t('adminAgencyDetail.inviteLink')}</p>
                      <div className="flex gap-2">
                        <Input value={inviteUrl} readOnly className="font-mono text-xs" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(inviteUrl);
                            toast.success(t('adminAgencyDetail.toastCopied'));
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setInviteUrl(null); setShowInvite(false); }}>
                        {t('adminAgencyDetail.close')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input placeholder={t('adminAgencyDetail.managerNamePlaceholder')} value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                      <Input type="email" placeholder={t('adminAgencyDetail.emailPlaceholder')} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                      <Button
                        size="sm"
                        onClick={() => invite.mutate({ email: adminEmail, fullName: adminName })}
                        disabled={!adminEmail || !adminName || invite.isPending}
                      >
                        {invite.isPending ? t('adminAgencyDetail.creating') : t('adminAgencyDetail.generateInvite')}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {agency.memberships.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('adminAgencyDetail.noManagers')}</p>
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
            <CardTitle className="text-base">{t('adminAgencyDetail.clients')} ({agency.subAccounts.filter((s) => s.status !== 'archived').length})</CardTitle>
            <Link href={`/admin/agencies/${agencyId}/new-client` as never}>
              <Button size="sm">
                <Plus className="h-4 w-4" /> {t('adminAgencyDetail.newClient')}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {agency.subAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('adminAgencyDetail.noClients')}</p>
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
                      if (confirm(t('adminAgencyDetail.confirmArchiveClient').replace('{name}', s.name))) deleteClient.mutate(s.id);
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

interface AgencyAccessInfo {
  login: string | null;
  userId: string | null;
  status: string | null;
}

function AgencyAccessCard({ agencyId }: { agencyId: string }) {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const [creds, setCreds] = useState<{ login: string; password: string } | null>(null);

  const { data: access } = useQuery<AgencyAccessInfo>({
    queryKey: ['agency-access', agencyId],
    queryFn: () => apiClient.get(`/agencies/${agencyId}/access`),
  });

  const reset = useMutation({
    mutationFn: () =>
      apiClient.post<{ login: string; password: string }>(`/agencies/${agencyId}/access/reset-password`, {}),
    onSuccess: (res) => {
      setCreds(res);
      qc.invalidateQueries({ queryKey: ['agency-access', agencyId] });
      qc.invalidateQueries({ queryKey: ['agency', agencyId] });
      toast.success(t('adminAgencyDetail.passwordReset'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <KeyRound className="h-4 w-4" /> {t('adminAgencyDetail.agencyAccess')}
        </CardTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('adminAgencyDetail.agencyAccessSubtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{t('adminAgencyDetail.loginLabel')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted/40 px-2 py-1.5 font-mono text-xs">
              {access?.login ?? t('adminAgencyDetail.noAccessGenerated')}
            </code>
            {access?.login && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(access.login!);
                  toast.success(t('adminAgencyDetail.toastCopied'));
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => reset.mutate()} disabled={reset.isPending}>
              <KeyRound className="h-4 w-4" /> {access?.login ? t('adminAgencyDetail.resetPassword') : t('adminAgencyDetail.generateAccess')}
            </Button>
          </div>
        </div>
        {creds && (
          <div>
            <ClientAccessCreated login={creds.login} password={creds.password} />
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setCreds(null)}>
              {t('adminAgencyDetail.close')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
