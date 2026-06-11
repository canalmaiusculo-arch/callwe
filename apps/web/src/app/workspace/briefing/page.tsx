'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTenantStore } from '@/stores/tenant-store';
import { useTranslate } from '@/i18n/provider';

interface BriefingForm {
  businessSummary: string;
  targetAudience: string;
  pricingGuidelines: string;
  faq: Array<{ q: string; a: string }>;
  scripts: { opening: string; objectionHandling: string; closing: string };
}

interface Briefing extends BriefingForm {
  id: string;
  version: number;
  updatedAt: string;
}

export default function BriefingPage() {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const subAccountId = useTenantStore((s) => s.subAccountId);

  const { data: briefing } = useQuery<Briefing | null>({
    queryKey: ['briefing', subAccountId],
    queryFn: () => apiClient.get<Briefing | null>('/briefings'),
    enabled: !!subAccountId,
  });

  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm<BriefingForm>({
    defaultValues: {
      businessSummary: '',
      targetAudience: '',
      pricingGuidelines: '',
      faq: [],
      scripts: { opening: '', objectionHandling: '', closing: '' },
    },
  });

  const { fields: faqFields, append: appendFaq, remove: removeFaq } = useFieldArray({ control, name: 'faq' });

  useEffect(() => {
    if (briefing) {
      reset({
        businessSummary: briefing.businessSummary,
        targetAudience: briefing.targetAudience,
        pricingGuidelines: briefing.pricingGuidelines ?? '',
        faq: briefing.faq ?? [],
        scripts: briefing.scripts ?? { opening: '', objectionHandling: '', closing: '' },
      });
    } else {
      // Cliente sem briefing — limpa o form pra não aparecer dados de outro cliente
      reset({
        businessSummary: '',
        targetAudience: '',
        pricingGuidelines: '',
        faq: [],
        scripts: { opening: '', objectionHandling: '', closing: '' },
      });
    }
  }, [briefing, subAccountId, reset]);

  const save = useMutation({
    mutationFn: (data: BriefingForm) => apiClient.put('/briefings', data),
    onSuccess: () => {
      toast.success(t('briefing.savedToast'));
      qc.invalidateQueries({ queryKey: ['briefing', subAccountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <form onSubmit={handleSubmit((data) => save.mutate(data))} className="space-y-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('briefing.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('briefing.subtitle')}
            {briefing && <span className="ml-2">· {t('briefing.version')} {briefing.version}</span>}
          </p>
        </div>
        <Button type="submit" disabled={isSubmitting || !subAccountId}>
          {isSubmitting ? t('briefing.saving') : !subAccountId ? t('briefing.selectClient') : t('briefing.save')}
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('briefing.overview')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={t('briefing.businessSummaryLabel')}>
            <Textarea rows={4} {...register('businessSummary', { required: true })} />
          </Field>
          <Field label={t('briefing.targetAudienceLabel')}>
            <Textarea rows={3} {...register('targetAudience', { required: true })} />
          </Field>
          <Field label={t('briefing.pricingGuidelinesLabel')}>
            <Textarea rows={3} {...register('pricingGuidelines')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('briefing.scripts')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={t('briefing.openingLabel')}>
            <Textarea rows={3} {...register('scripts.opening')} />
          </Field>
          <Field label={t('briefing.objectionHandlingLabel')}>
            <Textarea rows={3} {...register('scripts.objectionHandling')} />
          </Field>
          <Field label={t('briefing.closingLabel')}>
            <Textarea rows={3} {...register('scripts.closing')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('briefing.faq')}</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => appendFaq({ q: '', a: '' })}>
              <Plus className="h-4 w-4" /> {t('briefing.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqFields.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('briefing.emptyFaq')}</p>
          )}
          {faqFields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_2fr_auto] gap-2 rounded-md border p-3">
              <Input placeholder={t('briefing.questionPlaceholder')} {...register(`faq.${i}.q` as const)} />
              <Textarea rows={2} placeholder={t('briefing.answerPlaceholder')} {...register(`faq.${i}.a` as const)} />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeFaq(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
