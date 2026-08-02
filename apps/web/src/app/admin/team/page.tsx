'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Copy, UserX, Pencil, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslate } from '@/i18n/provider';

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
  const { t } = useTranslate();
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
      toast.success(t('adminTeam.agentInvited'));
      setInviteUrl(data.inviteUrl);
      qc.invalidateQueries({ queryKey: ['all-agents'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiClient.del(`/team/${id}`),
    onSuccess: () => {
      toast.success(t('adminTeam.agentRemoved'));
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
          <h1 className="text-2xl font-bold md:text-3xl">{t('adminTeam.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {agents.length} {t('adminTeam.subtitle')}
          </p>
        </div>
        <Button onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="h-4 w-4" /> {t('adminTeam.registerAgent')}
        </Button>
      </header>

      {showInvite && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">{t('adminTeam.newAgent')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inviteUrl ? (
              <>
                <p className="text-sm">{t('adminTeam.sendLink')}</p>
                <div className="flex gap-2">
                  <Input value={inviteUrl} readOnly className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      toast.success(t('adminTeam.copied'));
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" onClick={reset}>
                  {t('adminTeam.close')}
                </Button>
              </>
            ) : (
              <>
                <Input placeholder={t('adminTeam.fullNamePlaceholder')} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <Input
                  type="email"
                  placeholder="email@callwe.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div>
                  <label className="text-sm font-medium">
                    {t('adminTeam.assignToClients')} ({selectedSubs.length} {t('adminTeam.selected')})
                  </label>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {t('adminTeam.assignHint')}
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
                    {invite.isPending ? t('adminTeam.creating') : t('adminTeam.generateInvite')}
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    {t('adminTeam.cancel')}
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
              {t('adminTeam.emptyAgents')}
            </CardContent>
          </Card>
        )}
        {agents.map((a) => (
          <AgentRow key={a.id} agent={a} subs={subs} onRemove={() => remove.mutate(a.id)} />
        ))}
      </div>
    </div>
  );
}

function AgentRow({
  agent,
  subs,
  onRemove,
}: {
  agent: Agent;
  subs: SubAccount[];
  onRemove: () => void;
}) {
  const { t } = useTranslate();
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex-1">
            <p className="font-medium">{agent.fullName}</p>
            <p className="text-xs text-muted-foreground">{agent.email}</p>
            {agent.assignedSubAccounts.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('adminTeam.serves')} {agent.assignedSubAccounts.map((s) => s.name).join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={agent.status === 'active' ? 'success' : agent.status === 'invited' ? 'warning' : 'secondary'}
            >
              {t(`adminTeam.status.${agent.status}`)}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} title={t('adminTeam.editServedClients')}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onRemove} title={t('adminTeam.removeAgent')}>
              <UserX className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      {editing && <EditAgentSubAccounts agent={agent} subs={subs} onClose={() => setEditing(false)} />}
    </>
  );
}

function EditAgentSubAccounts({
  agent,
  subs,
  onClose,
}: {
  agent: Agent;
  subs: SubAccount[];
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const initial = agent.assignedSubAccounts.map((s) => s.id);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [filter, setFilter] = useState('');

  const visible = subs.filter((s) =>
    !filter ? true : s.name.toLowerCase().includes(filter.toLowerCase()),
  );

  const sync = useMutation({
    mutationFn: () =>
      apiClient.post(`/team/${agent.id}/sub-accounts`, { subAccountIds: Array.from(selected) }),
    onSuccess: (r: unknown) => {
      const res = r as { added: number; removed: number; total: number };
      toast.success(`${t('adminTeam.updated')}: +${res.added} / −${res.removed} → ${res.total} ${t('adminTeam.clients')}`);
      qc.invalidateQueries({ queryKey: ['all-agents'] });
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
            <CardTitle className="text-base">{t('adminTeam.servedClientsBy')} {agent.fullName}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selected.size} {t('adminTeam.of')} {subs.length} {t('adminTeam.selected')}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex max-h-[60vh] flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2">
            <Input placeholder={t('adminTeam.filterClients')} value={filter} onChange={(e) => setFilter(e.target.value)} />
            <Button size="sm" variant="outline" onClick={toggleAll}>
              {selected.size === visible.length && visible.length > 0 ? t('adminTeam.clear') : t('adminTeam.all')}
            </Button>
          </div>
          <div className="flex-1 space-y-0.5 overflow-auto rounded-md border p-2">
            {visible.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">{t('adminTeam.noClientsMatch')}</p>
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
                <span className="flex-1 text-sm">{s.name}</span>
                {s.agency && <span className="text-xs text-muted-foreground">{s.agency.name}</span>}
              </label>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>{t('adminTeam.cancel')}</Button>
            <Button size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? t('adminTeam.saving') : t('adminTeam.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
