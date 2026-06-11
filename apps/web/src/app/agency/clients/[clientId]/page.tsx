'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Plus, Trash2, ExternalLink, KeyRound, UserPlus, Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HelpHint } from '@/components/help-hint';
import { useTenantStore } from '@/stores/tenant-store';
import { useTranslate } from '@/i18n/provider';

interface ClientDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  cloudtalkTag: string;
  settings: Record<string, unknown> | null;
  phoneNumbers: Array<{ id: string; e164: string; label: string | null; cloudtalkNumberId: string }>;
  _count: { leads: number; interactions: number };
}

interface WhatsappGroup {
  phone: string;
  name: string;
}

interface AvailableNumber {
  cloudtalkNumberId: string;
  e164: string;
  label: string | null;
  country: string | null;
  assignedTo: string | null;
}

export default function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const { t } = useTranslate();
  const qc = useQueryClient();
  const router = useRouter();
  const setTenant = useTenantStore((s) => s.setTenant);
  const [showAdd, setShowAdd] = useState(false);

  const { data: client } = useQuery<ClientDetail>({
    queryKey: ['client', clientId],
    queryFn: () => apiClient.get(`/sub-accounts/${clientId}`),
  });

  const { data: available = [] } = useQuery<AvailableNumber[]>({
    queryKey: ['available-numbers'],
    queryFn: () => apiClient.get('/phone-numbers/available'),
    enabled: showAdd,
  });

  const attach = useMutation({
    mutationFn: (n: AvailableNumber) =>
      apiClient.post('/phone-numbers', {
        subAccountId: clientId,
        cloudtalkNumberId: n.cloudtalkNumberId,
        e164: n.e164,
        label: n.label,
        country: n.country,
      }),
    onSuccess: () => {
      toast.success(t('clientDetail.numberAttached'));
      qc.invalidateQueries({ queryKey: ['client', clientId] });
      qc.invalidateQueries({ queryKey: ['available-numbers'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const release = useMutation({
    mutationFn: (id: string) => apiClient.del(`/phone-numbers/${id}`),
    onSuccess: () => {
      toast.success(t('clientDetail.numberReleased'));
      qc.invalidateQueries({ queryKey: ['client', clientId] });
    },
  });

  if (!client) return <div className="p-8 text-muted-foreground">{t('clientDetail.loading')}</div>;

  const free = available.filter((n) => !n.assignedTo);
  const taken = available.filter((n) => n.assignedTo);

  return (
    <div className="p-8">
      <Link href={'/agency/clients' as never} className="text-sm text-muted-foreground hover:underline">
        ← {t('clientDetail.backToClients')}
      </Link>
      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <div className="mt-2 flex gap-2 text-sm">
            <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>{client.status}</Badge>
            <Badge variant="outline">{client.plan}</Badge>
          </div>
        </div>
        <Button
          onClick={() => {
            setTenant(clientId, client.name);
            router.push('/workspace');
          }}
        >
          <ExternalLink className="h-4 w-4" /> {t('clientDetail.openWorkspace')}
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('clientDetail.leads')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client._count.leads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('clientDetail.interactions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client._count.interactions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('clientDetail.numbers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client.phoneNumbers.length}</p>
          </CardContent>
        </Card>
      </div>

      <ClientSettingsCard client={client} />
      <ClientAccessCard clientId={clientId} />

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('clientDetail.assignedNumbers')}</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4" /> {t('clientDetail.addNumber')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {client.phoneNumbers.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('clientDetail.noNumbersYet')}</p>
          )}
          {client.phoneNumbers.map((n) => (
            <div key={n.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-mono text-sm">{n.e164}</p>
                  {n.label && <p className="text-xs text-muted-foreground">{n.label}</p>}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => release.mutate(n.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {showAdd && (
        <>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">
                {t('clientDetail.availableNumbers')} ({free.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {free.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('clientDetail.allNumbersAssigned')}
                </p>
              )}
              {free.map((n) => (
                <div key={n.cloudtalkNumberId} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-mono text-sm">{n.e164}</p>
                    {n.label && <p className="text-xs text-muted-foreground">{n.label}</p>}
                  </div>
                  <Button size="sm" onClick={() => attach.mutate(n)} disabled={attach.isPending}>
                    {t('clientDetail.assign')}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {taken.length > 0 && (
            <Card className="mt-4 opacity-70">
              <CardHeader>
                <CardTitle className="text-base">{t('clientDetail.numbersInUse')} ({taken.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {taken.map((n) => (
                  <div key={n.cloudtalkNumberId} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-mono text-sm">{n.e164}</p>
                      {n.label && <p className="text-xs text-muted-foreground">{n.label}</p>}
                    </div>
                    <Badge variant="secondary">{n.assignedTo}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <WhatsappGroupCard clientId={clientId} currentGroupId={(client.settings?.whatsappGroupId as string | undefined) ?? null} />

      <ZapierWebhookCard clientId={clientId} />
    </div>
  );
}

function ClientSettingsCard({ client }: { client: ClientDetail }) {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [plan, setPlan] = useState(client.plan);
  const [confirmDelete, setConfirmDelete] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['client', client.id] });
    qc.invalidateQueries({ queryKey: ['agency-clients'] });
  };

  const save = useMutation({
    mutationFn: () => apiClient.patch(`/sub-accounts/${client.id}`, { name, plan }),
    onSuccess: () => {
      toast.success(t('clientDetail.clientUpdated'));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: (status: string) => apiClient.patch(`/sub-accounts/${client.id}`, { status }),
    onSuccess: () => {
      toast.success(t('clientDetail.statusUpdated'));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => apiClient.del(`/sub-accounts/${client.id}/permanent`),
    onSuccess: () => {
      toast.success(t('clientDetail.clientDeletedPermanently'));
      qc.invalidateQueries({ queryKey: ['agency-clients'] });
      router.push('/agency/clients');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archived = client.status === 'archived';

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">{t('clientDetail.clientSettings')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">{t('clientDetail.nameLabel')}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('clientDetail.planLabel')}</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="starter">starter</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {t('clientDetail.save')}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <span className="text-sm text-muted-foreground">{t('clientDetail.currentStatus')}</span>
          <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>{client.status}</Badge>
          {!archived ? (
            <>
              {client.status === 'active' ? (
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate('paused')}>
                  {t('clientDetail.pause')}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate('active')}>
                  {t('clientDetail.activate')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate('archived')}>
                {t('clientDetail.archive')}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setStatus.mutate('active')}>
              <RotateCcw className="h-4 w-4" /> {t('clientDetail.reactivate')}
            </Button>
          )}
        </div>

        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">{t('clientDetail.deletePermanently')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('clientDetail.deleteWarning')} <strong>{client.name}</strong>
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder={client.name}
              className="max-w-xs"
            />
            <Button
              variant="destructive"
              disabled={confirmDelete !== client.name || remove.isPending}
              onClick={() => remove.mutate()}
            >
              <Trash2 className="h-4 w-4" /> {t('clientDetail.delete')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TeamUser {
  id: string;
  email: string;
  fullName: string;
  status: string;
  memberships: Array<{ role: string; subAccountId: string | null }>;
}

function ClientAccessCard({ clientId }: { clientId: string }) {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [link, setLink] = useState<{ type: string; url: string } | null>(null);

  const { data: team = [] } = useQuery<TeamUser[]>({
    queryKey: ['team-for-client'],
    queryFn: () => apiClient.get('/team'),
  });
  const clientUsers = team.filter((u) =>
    u.memberships.some((m) => m.subAccountId === clientId && m.role === 'client_viewer'),
  );

  const invite = useMutation({
    mutationFn: () =>
      apiClient.post<{ inviteUrl: string }>('/team/invite', {
        email,
        fullName,
        role: 'client_viewer',
        subAccountIds: [clientId],
      }),
    onSuccess: (res) => {
      toast.success(t('clientDetail.clientAccessCreated'));
      setLink({ type: 'invite', url: res.inviteUrl });
      setEmail('');
      setFullName('');
      qc.invalidateQueries({ queryKey: ['team-for-client'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: (userId: string) =>
      apiClient.post<{ type: string; url: string }>(`/team/${userId}/reset-access`, {}),
    onSuccess: (res) => {
      setLink(res);
      toast.success(t('clientDetail.linkGenerated'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          {t('clientDetail.clientAccess')} <HelpHint topic="cliente-acesso" />
        </CardTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('clientDetail.clientAccessSubtitle')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {clientUsers.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('clientDetail.noClientAccessYet')}</p>
        )}
        {clientUsers.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{u.fullName}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={u.status === 'active' ? 'success' : 'secondary'}>
                {u.status === 'active' ? t('clientDetail.statusActive') : u.status === 'invited' ? t('clientDetail.statusInvited') : u.status}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => reset.mutate(u.id)} disabled={reset.isPending}>
                <KeyRound className="h-4 w-4" /> {t('clientDetail.resetAccess')}
              </Button>
            </div>
          </div>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email && fullName) invite.mutate();
          }}
          className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">{t('clientDetail.contactNameLabel')}</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('clientDetail.contactNamePlaceholder')} required />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">{t('clientDetail.emailLabel')}</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('clientDetail.emailPlaceholder')} required />
          </div>
          <Button type="submit" disabled={invite.isPending}>
            <UserPlus className="h-4 w-4" /> {t('clientDetail.invite')}
          </Button>
        </form>

        {link && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium">
              {link.type === 'invite' ? t('clientDetail.inviteLink') : t('clientDetail.resetPasswordLink')} {t('clientDetail.sendToClient')}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border bg-background px-2 py-1.5 font-mono text-xs">
                {link.url}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(link.url);
                  toast.success(t('clientDetail.copied'));
                }}
              >
                <Copy className="h-4 w-4" /> {t('clientDetail.copy')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WhatsappGroupCard({
  clientId,
  currentGroupId,
}: {
  clientId: string;
  currentGroupId: string | null;
}) {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: groups = [], isLoading, error } = useQuery<WhatsappGroup[]>({
    queryKey: ['whatsapp-groups'],
    queryFn: () => apiClient.get('/whatsapp/groups'),
    enabled: expanded,
    retry: false,
  });

  const save = useMutation({
    mutationFn: (groupId: string | null) =>
      apiClient.patch(`/sub-accounts/${clientId}/whatsapp`, { whatsappGroupId: groupId }),
    onSuccess: () => {
      toast.success(currentGroupId ? t('clientDetail.groupUpdated') : t('clientDetail.groupConnected'));
      qc.invalidateQueries({ queryKey: ['client', clientId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const currentGroup = groups.find((g) => g.phone === currentGroupId);

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{t('clientDetail.whatsappTitle')}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('clientDetail.whatsappSubtitle')}
          </p>
        </div>
        {currentGroupId && (
          <Badge variant="secondary" className="font-mono text-xs">
            {currentGroup?.name ?? currentGroupId}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {!expanded ? (
          <Button size="sm" variant="outline" onClick={() => setExpanded(true)}>
            {currentGroupId ? t('clientDetail.changeGroup') : t('clientDetail.configureGroup')}
          </Button>
        ) : (
          <div className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">{t('clientDetail.loadingGroups')}</p>}
            {error && (
              <p className="text-sm text-red-600">
                {(error as Error).message ?? t('clientDetail.errorLoadingGroups')}
              </p>
            )}
            {!isLoading && !error && groups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('clientDetail.noGroupsFound')}
              </p>
            )}
            {groups.length > 0 && (
              <select
                value={currentGroupId ?? ''}
                onChange={(e) => save.mutate(e.target.value || null)}
                disabled={save.isPending}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">{t('clientDetail.disconnect')}</option>
                {groups.map((g) => (
                  <option key={g.phone} value={g.phone}>
                    {g.name} ({g.phone})
                  </option>
                ))}
              </select>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
              {t('clientDetail.close')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ZapierKeyResponse {
  apiKey: string;
  webhookUrl: string;
}

function ZapierWebhookCard({ clientId }: { clientId: string }) {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState(false);

  const { data: key } = useQuery<ZapierKeyResponse>({
    queryKey: ['zapier-key', clientId],
    queryFn: () => apiClient.get(`/sub-accounts/${clientId}/zapier-key`),
  });

  const rotate = useMutation({
    mutationFn: () => apiClient.post<ZapierKeyResponse>(`/sub-accounts/${clientId}/zapier-key/rotate`, {}),
    onSuccess: () => {
      toast.success(t('clientDetail.keyRotated'));
      qc.invalidateQueries({ queryKey: ['zapier-key', clientId] });
      setRevealed(true);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} ${t('clientDetail.copiedSuffix')}`);
  };

  if (!key) return null;

  const maskedKey = revealed ? key.apiKey : `${key.apiKey.slice(0, 6)}${'•'.repeat(20)}${key.apiKey.slice(-4)}`;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          {t('clientDetail.webhookTitle')} <HelpHint topic="leads-webhook" />
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('clientDetail.webhookSubtitle')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{t('clientDetail.webhookUrlLabel')}</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted/50 px-2 py-1.5 font-mono text-xs">
              {key.webhookUrl}
            </code>
            <Button size="sm" variant="outline" onClick={() => copy(key.webhookUrl, 'URL')}>
              {t('clientDetail.copy')}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{t('clientDetail.apiKeyLabel')} (header X-CallWe-Api-Key)</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted/50 px-2 py-1.5 font-mono text-xs">
              {maskedKey}
            </code>
            <Button size="sm" variant="outline" onClick={() => setRevealed(!revealed)}>
              {revealed ? t('clientDetail.hide') : t('clientDetail.reveal')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(key.apiKey, t('clientDetail.keyLabel'))}>
              {t('clientDetail.copy')}
            </Button>
          </div>
        </div>

        <details className="rounded-md border bg-muted/30 p-3 text-xs">
          <summary className="cursor-pointer font-medium">{t('clientDetail.howToConfigure')}</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
            <li>{t('clientDetail.step1Before')} <strong>Webhook</strong> / <em>HTTP POST</em> {t('clientDetail.step1After')}</li>
            <li><strong>URL:</strong> {t('clientDetail.stepUrl')}</li>
            <li><strong>{t('clientDetail.stepMethodLabel')}</strong> <code>POST</code> · <strong>Payload:</strong> <code>json</code></li>
            <li><strong>Header:</strong> {t('clientDetail.stepHeaderBefore')} <code>X-CallWe-Api-Key</code> {t('clientDetail.stepHeaderAfter')}</li>
            <li><strong>{t('clientDetail.stepFieldsLabel')}</strong> {t('clientDetail.stepFieldsHint')}
              <ul className="mt-1 list-disc pl-5">
                <li><code>name</code> → {t('clientDetail.fieldName')}</li>
                <li><code>phone</code> → {t('clientDetail.fieldPhone')}</li>
                <li><code>email</code> → {t('clientDetail.fieldEmail')}</li>
                <li><code>formName</code> {t('clientDetail.fieldOptional')} → {t('clientDetail.fieldFormName')}</li>
                <li><code>campaignName</code> {t('clientDetail.fieldOptional')} → {t('clientDetail.fieldCampaignName')}</li>
              </ul>
            </li>
            <li>{t('clientDetail.stepTest')}</li>
          </ol>
        </details>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {t('clientDetail.rotateWarning')}
          </p>
          <Button size="sm" variant="outline" onClick={() => rotate.mutate()} disabled={rotate.isPending}>
            {t('clientDetail.rotateKey')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
