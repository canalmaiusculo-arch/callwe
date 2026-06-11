'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslate } from '@/i18n/provider';

interface SubAccountOption {
  id: string;
  name: string;
  slug: string;
  agencyId: string;
  plan: 'starter' | 'pro' | 'enterprise';
  status: string;
}

export default function SelectSubAccountPage() {
  const { t } = useTranslate();
  const router = useRouter();
  const setTenant = useTenantStore((s) => s.setTenant);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) router.replace('/login');
  }, [accessToken, router]);

  const { data: subs = [], isLoading } = useQuery<SubAccountOption[]>({
    queryKey: ['my-sub-accounts'],
    queryFn: () => apiClient.get<SubAccountOption[]>('/sub-accounts/mine'),
    enabled: !!accessToken,
  });

  // Se só tem uma, seleciona automaticamente
  useEffect(() => {
    if (subs.length === 1) {
      const s = subs[0]!;
      setTenant(s.id, s.name);
      router.replace('/workspace');
    }
  }, [subs, setTenant, router]);

  function pick(s: SubAccountOption) {
    setTenant(s.id, s.name);
    router.push('/workspace');
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{t('selectSub.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('selectSub.accessIntro')} {subs.length}{' '}
          {subs.length === 1 ? t('selectSub.accountSingular') : t('selectSub.accountPlural')}.
        </p>
      </header>

      {isLoading && <p className="text-muted-foreground">{t('selectSub.loading')}</p>}

      {!isLoading && subs.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {t('selectSub.empty')}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {subs.map((s) => (
          <button
            key={s.id}
            onClick={() => pick(s)}
            className="w-full text-left"
          >
            <Card className="transition-colors hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                <div>
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{s.plan}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          </button>
        ))}
      </div>
    </main>
  );
}
