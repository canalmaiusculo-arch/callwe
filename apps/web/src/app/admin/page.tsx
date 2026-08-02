'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight, Copy } from 'lucide-react';
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
  _count: { subAccounts: number };
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
            <Card className="transition-colors hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                <div>
                  <CardTitle className="text-base">{a.name}</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.slug} · {a.billingEmail}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {a._count.subAccounts} {t('adminAgencies.clientsSuffix')}
                  </span>
                  <Badge variant={a.status === 'active' ? 'success' : 'secondary'}>{a.status}</Badge>
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
