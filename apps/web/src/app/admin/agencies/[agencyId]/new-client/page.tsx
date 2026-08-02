'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslate } from '@/i18n/provider';

interface AvailableNumber {
  cloudtalkNumberId: string;
  e164: string;
  label: string | null;
  country: string | null;
  assignedTo: string | null;
}

interface Agent {
  id: string;
  fullName: string;
  email: string;
}

export default function NewClientWizardPage({ params }: { params: Promise<{ agencyId: string }> }) {
  const { agencyId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslate();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [chosenNumberId, setChosenNumberId] = useState<string | null>(null);
  const [chosenAgentIds, setChosenAgentIds] = useState<string[]>([]);

  const { data: numbers = [] } = useQuery<AvailableNumber[]>({
    queryKey: ['available-numbers'],
    queryFn: () => apiClient.get('/phone-numbers/available'),
    enabled: step >= 2,
  });
  const free = numbers.filter((n) => !n.assignedTo);

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['all-agents'],
    queryFn: () => apiClient.get('/team/all'),
    enabled: step >= 3,
  });

  function handleName(v: string) {
    setName(v);
    if (!slug || slug === slugify(name)) setSlug(slugify(v));
  }

  const submit = useMutation({
    mutationFn: async () => {
      const sub = await apiClient.post<{ id: string }>('/sub-accounts', { name, slug, agencyId });
      const num = numbers.find((n) => n.cloudtalkNumberId === chosenNumberId);
      if (num) {
        await apiClient.post('/phone-numbers', {
          subAccountId: sub.id,
          cloudtalkNumberId: num.cloudtalkNumberId,
          e164: num.e164,
          label: num.label ?? name,
          country: num.country ?? 'US',
        });
      }
      for (const userId of chosenAgentIds) {
        await apiClient.post('/team/assign', { userId, subAccountId: sub.id });
      }
      return sub;
    },
    onSuccess: () => {
      toast.success(t('adminNewClient.toastCreated'));
      qc.invalidateQueries({ queryKey: ['agency', agencyId] });
      router.push(`/admin/agencies/${agencyId}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href={`/admin/agencies/${agencyId}` as never} className="text-sm text-muted-foreground hover:underline">
        ← {t('adminNewClient.backToAgency')}
      </Link>

      <h1 className="mt-2 text-2xl font-bold md:text-3xl">{t('adminNewClient.title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('adminNewClient.subtitle')}</p>

      <Stepper current={step} />

      <Card className="mt-6">
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle className="text-base">{t('adminNewClient.step1Title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">{t('adminNewClient.clientNameLabel')}</label>
                <Input value={name} onChange={(e) => handleName(e.target.value)} placeholder={t('adminNewClient.clientNamePlaceholder')} />
              </div>
              <div>
                <label className="text-sm font-medium">{t('adminNewClient.slugLabel')}</label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="clinica-silva" />
                <p className="mt-1 text-xs text-muted-foreground">{t('adminNewClient.slugHint')}</p>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!name || !slug}>
                  {t('adminNewClient.next')} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle className="text-base">{t('adminNewClient.step2Title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {free.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('adminNewClient.noNumbers')}
                </p>
              )}
              <div className="max-h-80 space-y-1 overflow-auto rounded-md border p-2">
                {free.map((n) => (
                  <label
                    key={n.cloudtalkNumberId}
                    className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-muted/40"
                  >
                    <input
                      type="radio"
                      name="number"
                      checked={chosenNumberId === n.cloudtalkNumberId}
                      onChange={() => setChosenNumberId(n.cloudtalkNumberId)}
                    />
                    <span className="flex-1 text-sm">
                      <span className="font-mono">{n.e164}</span>
                      {n.label && <span className="ml-2 text-muted-foreground">— {n.label}</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{n.country}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  {t('adminNewClient.back')}
                </Button>
                <Button onClick={() => setStep(3)} disabled={!chosenNumberId}>
                  {t('adminNewClient.next')} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle className="text-base">{t('adminNewClient.step3Title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {t('adminNewClient.agentsHint')}
              </p>
              {agents.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('adminNewClient.noAgentsPrefix')} <Link href={'/admin/team' as never} className="underline">{t('adminNewClient.agentsLinkLabel')}</Link> {t('adminNewClient.noAgentsSuffix')}
                </p>
              )}
              <div className="max-h-64 space-y-1 overflow-auto rounded-md border p-2">
                {agents.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={chosenAgentIds.includes(a.id)}
                      onChange={() =>
                        setChosenAgentIds((cur) =>
                          cur.includes(a.id) ? cur.filter((i) => i !== a.id) : [...cur, a.id],
                        )
                      }
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.fullName}</p>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  {t('adminNewClient.back')}
                </Button>
                <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
                  {submit.isPending ? t('adminNewClient.creating') : t('adminNewClient.createClient')}
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  const { t } = useTranslate();
  const steps = [t('adminNewClient.stepperName'), t('adminNewClient.stepperNumber'), t('adminNewClient.stepperAgents')];
  return (
    <div className="mt-4 flex items-center gap-2">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active ? 'bg-primary text-primary-foreground' : done ? 'bg-emerald-500 text-white' : 'bg-muted'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : n}
            </div>
            <span className={`text-sm ${active ? 'font-medium' : 'text-muted-foreground'}`}>{label}</span>
            {n < steps.length && <div className="ml-2 h-px flex-1 bg-border" />}
          </div>
        );
      })}
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
