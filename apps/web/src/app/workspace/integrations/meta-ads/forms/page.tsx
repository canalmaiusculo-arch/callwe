'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Facebook } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useTranslate } from '@/i18n/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

interface MetaForm {
  id: string;
  name: string;
  status: string;
}

interface EnabledForm {
  id: string;
  pageId: string;
  formId: string;
  formName: string;
  enabled: boolean;
}

export default function MetaAdsFormsPage() {
  const { t } = useTranslate();
  const qc = useQueryClient();
  const [selectedPage, setSelectedPage] = useState<MetaPage | null>(null);
  const [pageSearch, setPageSearch] = useState('');

  const { data: pages = [], isLoading: loadingPages } = useQuery<MetaPage[]>({
    queryKey: ['meta-pages'],
    queryFn: () => apiClient.get<MetaPage[]>('/integrations/meta-ads/pages'),
  });

  const {
    data: forms = [],
    isLoading: loadingForms,
    isError: formsError,
  } = useQuery<MetaForm[]>({
    queryKey: ['meta-forms', selectedPage?.id],
    queryFn: () =>
      apiClient.get<MetaForm[]>(
        `/integrations/meta-ads/pages/${selectedPage!.id}/forms?pageAccessToken=${encodeURIComponent(selectedPage!.access_token)}`,
      ),
    enabled: !!selectedPage,
    retry: false,
  });

  const { data: enabled = [] } = useQuery<EnabledForm[]>({
    queryKey: ['meta-enabled-forms'],
    queryFn: () => apiClient.get<EnabledForm[]>('/integrations/meta-ads/forms'),
  });

  const subscribe = useMutation({
    mutationFn: (form: MetaForm) =>
      apiClient.post('/integrations/meta-ads/forms/subscribe', {
        pageId: selectedPage!.id,
        pageAccessToken: selectedPage!.access_token,
        formId: form.id,
        formName: form.name,
      }),
    onSuccess: () => {
      toast.success(t('metaForms.formActivated'));
      qc.invalidateQueries({ queryKey: ['meta-enabled-forms'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unsubscribe = useMutation({
    mutationFn: (formId: string) => apiClient.del(`/integrations/meta-ads/forms/${formId}`),
    onSuccess: () => {
      toast.success(t('metaForms.formDeactivated'));
      qc.invalidateQueries({ queryKey: ['meta-enabled-forms'] });
    },
  });

  const enabledIds = new Set(enabled.map((e) => e.formId));
  const visiblePages = pageSearch
    ? pages.filter((p) => p.name.toLowerCase().includes(pageSearch.toLowerCase()))
    : pages;

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">{t('metaForms.title')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('metaForms.subtitle')}
        </p>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* Páginas */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="text-base">
              {t('metaForms.yourPages')} {pages.length > 0 && <span className="text-muted-foreground">({pages.length})</span>}
            </CardTitle>
            {pages.length > 8 && (
              <Input
                value={pageSearch}
                onChange={(e) => setPageSearch(e.target.value)}
                placeholder={t('metaForms.searchPages')}
                className="mt-2 h-8"
              />
            )}
          </CardHeader>
          <CardContent className="max-h-[65vh] space-y-1 overflow-auto">
            {loadingPages && <p className="text-sm text-muted-foreground">{t('metaForms.loading')}</p>}
            {!loadingPages && pages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('metaForms.noPages')}
              </p>
            )}
            {!loadingPages && pages.length > 0 && visiblePages.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('metaForms.noPagesMatch')}</p>
            )}
            {visiblePages.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPage(p)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${
                  selectedPage?.id === p.id ? 'bg-muted font-medium' : ''
                }`}
              >
                <Facebook className="h-4 w-4 shrink-0 text-blue-600" />
                <div className="flex-1">
                  <p>{p.name}</p>
                  {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Formulários */}
        <Card className="col-span-8">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedPage ? `${t('metaForms.formsFor')} — ${selectedPage.name}` : t('metaForms.selectPage')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedPage && (
              <p className="text-sm text-muted-foreground">
                {t('metaForms.choosePage')}
              </p>
            )}
            {selectedPage && loadingForms && (
              <p className="text-sm text-muted-foreground">{t('metaForms.loadingForms')}</p>
            )}
            {selectedPage && !loadingForms && formsError && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {t('metaForms.formsError')}
              </p>
            )}
            {selectedPage && !loadingForms && !formsError && forms.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('metaForms.noForms')}</p>
            )}
            {selectedPage &&
              forms.map((f) => {
                const isEnabled = enabledIds.has(f.id);
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{f.name}</p>
                      <Badge variant="secondary" className="mt-1">
                        {f.status}
                      </Badge>
                    </div>
                    {isEnabled ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-sm text-emerald-600">
                          <Check className="h-4 w-4" /> {t('metaForms.active')}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unsubscribe.mutate(f.id)}
                        >
                          {t('metaForms.deactivate')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => subscribe.mutate(f)}
                        disabled={subscribe.isPending}
                      >
                        {t('metaForms.activate')}
                      </Button>
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
