'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight, Copy, Building2, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslate } from '@/i18n/provider';

interface Agency {
  id: string;
  name: string;
  slug: string;
  billingEmail: string;
  status: 'active' | 'suspended';
  createdAt: string;
  _count: { subAccounts: number };
  activeClients: number;
  totalLeads: number;
  agents: number;
}

export default function AdminAgenciesPage() {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const { data: agencies = [] } = useQuery<Agency[]>({
    queryKey: ['agencies'],
    queryFn: () => apiClient.get('/agencies'),
  });

  const create = useMutation({
    mutationFn: async () => {
      const agency = await apiClient.post<{ id: string }>('/agencies', { name, slug, billingEmail });
      if (adminEmail && adminName) {
        const r = await apiClient.post<{ inviteUrl: string }>(`/agencies/${agency.id}/invite-admin`, {
          email: adminEmail,
          fullName: adminName,
        });
        return r.inviteUrl;
      }
      return null;
    },
    onSuccess: (url) => {
      toast.success(t('adminAgencies.toastCreated'));
      if (url) setInviteUrl(url);
      qc.invalidateQueries({ queryKey: ['agencies'] });
      if (!url) setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleName(v: string) {
    setName(v);
    if (!slug || slug === slugify(name)) setSlug(slugify(v));
  }

  function reset() {
    setName('');
    setSlug('');
    setBillingEmail('');
    setAdminName('');
    setAdminEmail('');
    setInviteUrl(null);
    setShowForm(false);
  }

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('adminAgencies.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {agencies.length} {t('adminAgencies.countSuffix')}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> {t('adminAgencies.newAgency')}
        </Button>
      </header>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">{t('adminAgencies.formTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inviteUrl ? (
              <>
                <p className="text-sm">{t('adminAgencies.inviteLinkInfo')}</p>
                <div className="flex gap-2">
                  <Input value={inviteUrl} readOnly className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      toast.success(t('adminAgencies.toastCopied'));
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" onClick={reset}>
                  {t('adminAgencies.close')}
                </Button>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">{t('adminAgencies.nameLabel')}</label>
                  <Input value={name} onChange={(e) => handleName(e.target.value)} placeholder={t('adminAgencies.namePlaceholder')} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('adminAgencies.slugLabel')}</label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="rk-pulse" />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('adminAgencies.billingEmailLabel')}</label>
                  <Input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="billing@agencia.com"
                  />
                </div>
                <div className="border-t pt-3">
                  <p className="mb-2 text-xs text-muted-foreground">{t('adminAgencies.inviteManagerHint')}</p>
                  <div className="space-y-2">
                    <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder={t('adminAgencies.managerNamePlaceholder')} />
                    <Input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="gestor@agencia.com"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => create.mutate()}
                    disabled={!name || !slug || !billingEmail || create.isPending}
                  >
                    {create.isPending ? t('adminAgencies.creating') : t('adminAgencies.createButton')}
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    {t('adminAgencies.cancel')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {agencies.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {t('adminAgencies.empty')}
            </CardContent>
          </Card>
        )}
        {agencies.map((a) => (
          <Link key={a.id} href={`/admin/agencies/${a.id}` as never}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white">
                      {a.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.slug} · {a.billingEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={a.status === 'active' ? 'success' : 'secondary'}>
                      {t(`adminAgencies.status.${a.status}`)}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3">
                  <AgencyStat icon={Building2} value={a.activeClients} label={t('adminAgencies.statClients')} />
                  <AgencyStat icon={Users} value={a.agents} label={t('adminAgencies.statAgents')} />
                  <AgencyStat icon={UserPlus} value={a.totalLeads} label={t('adminAgencies.statLeads')} />
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {t('adminAgencies.since')} {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AgencyStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="tabular text-lg font-bold leading-none">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
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
