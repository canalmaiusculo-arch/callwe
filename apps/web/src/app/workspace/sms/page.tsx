'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';

interface SmsInteraction {
  id: string;
  direction: 'inbound' | 'outbound';
  startedAt: string;
  fromNumber: string | null;
  toNumber: string | null;
  smsBody: string | null;
}

export default function SmsPage() {
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const { data: messages = [], isLoading } = useQuery<SmsInteraction[]>({
    queryKey: ['sms', subAccountId],
    queryFn: () => apiClient.get<SmsInteraction[]>('/interactions?type=sms'),
    enabled: !!subAccountId,
  });

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">SMS</h1>
        <p className="mt-1 text-muted-foreground">{messages.length} mensagens</p>
      </header>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="flex gap-3 rounded-md border p-3">
            <MessageSquare className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {m.direction === 'inbound' ? 'De' : 'Para'}:{' '}
                  <span className="font-mono">
                    {m.direction === 'inbound' ? m.fromNumber : m.toNumber}
                  </span>
                </span>
                <span>{new Date(m.startedAt).toLocaleString('pt-BR')}</span>
              </div>
              <p className="mt-1 text-sm">{m.smsBody}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
