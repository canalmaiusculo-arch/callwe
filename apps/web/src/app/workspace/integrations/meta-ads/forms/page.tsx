'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Facebook } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const qc = useQueryClient();
  const [selectedPage, setSelectedPage] = useState<MetaPage | null>(null);

  const { data: pages = [], isLoading: loadingPages } = useQuery<MetaPage[]>({
    queryKey: ['meta-pages'],
    queryFn: () => apiClient.get<MetaPage[]>('/integrations/meta-ads/pages'),
  });

  const { data: forms = [], isLoading: loadingForms } = useQuery<MetaForm[]>({
    queryKey: ['meta-forms', selectedPage?.id],
    queryFn: () =>
      apiClient.get<MetaForm[]>(
        `/integrations/meta-ads/pages/${selectedPage!.id}/forms?pageAccessToken=${encodeURIComponent(selectedPage!.access_token)}`,
      ),
    enabled: !!selectedPage,
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
      toast.success('Formulário ativado');
      qc.invalidateQueries({ queryKey: ['meta-enabled-forms'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unsubscribe = useMutation({
    mutationFn: (formId: string) => apiClient.del(`/integrations/meta-ads/forms/${formId}`),
    onSuccess: () => {
      toast.success('Formulário desativado');
      qc.invalidateQueries({ queryKey: ['meta-enabled-forms'] });
    },
  });

  const enabledIds = new Set(enabled.map((e) => e.formId));

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Meta Ads — formulários</h1>
        <p className="mt-1 text-muted-foreground">
          Selecione uma página e ative os formulários cujos leads devem cair no CRM.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* Páginas */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Suas páginas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {loadingPages && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!loadingPages && pages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma página encontrada. Verifique permissões no Facebook.
              </p>
            )}
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPage(p)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${
                  selectedPage?.id === p.id ? 'bg-muted font-medium' : ''
                }`}
              >
                <Facebook className="h-4 w-4 text-blue-600" />
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
              {selectedPage ? `Formulários — ${selectedPage.name}` : 'Selecione uma página'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedPage && (
              <p className="text-sm text-muted-foreground">
                Escolha uma página à esquerda para ver seus formulários de Lead Ads.
              </p>
            )}
            {selectedPage && loadingForms && (
              <p className="text-sm text-muted-foreground">Carregando formulários...</p>
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
                          <Check className="h-4 w-4" /> Ativo
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unsubscribe.mutate(f.id)}
                        >
                          Desativar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => subscribe.mutate(f)}
                        disabled={subscribe.isPending}
                      >
                        Ativar
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
