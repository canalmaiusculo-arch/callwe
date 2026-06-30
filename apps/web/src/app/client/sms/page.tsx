'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';
import { useTranslate } from '@/i18n/provider';

interface SmsInteraction {
  id: string;
  direction: 'inbound' | 'outbound';
  startedAt: string;
  fromNumber: string | null;
  toNumber: string | null;
  smsBody: string | null;
  lead: { id: string; name: string | null } | null;
}

export default function ClientSmsPage() {
  const { t } = useTranslate();
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const { data: sms = [], isLoading } = useQuery<SmsInteraction[]>({
    queryKey: ['client-sms', subAccountId],
    queryFn: () => apiClient.get<SmsInteraction[]>('/interactions?type=sms'),
    enabled: !!subAccountId,
  });

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">{t('clientSms.title')}</h1>
        <p className="mt-1 text-muted-foreground">{sms.length} {t('clientSms.messages')}</p>
      </header>

      {isLoading && <p className="text-muted-foreground">{t('clientSms.loading')}</p>}
      {!isLoading && sms.length === 0 && <p className="text-muted-foreground">{t('clientSms.empty')}</p>}

      <div className="space-y-2">
        {sms.map((m) => {
          const inbound = m.direction === 'inbound';
          const number = inbound ? m.fromNumber : m.toNumber;
          return (
            <div key={m.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {inbound ? (
                    <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="font-mono text-sm">{number ?? '—'}</span>
                  {m.lead?.name && <span className="text-xs text-muted-foreground">· {m.lead.name}</span>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(m.startedAt).toLocaleString('pt-BR')}
                </span>
              </div>
              {m.smsBody && <p className="mt-2 text-sm">{m.smsBody}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
