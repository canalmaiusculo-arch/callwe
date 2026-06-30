'use client';

import { useQuery } from '@tanstack/react-query';
import { Voicemail } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';
import { RecordingPlayer } from '@/components/recording-player';
import { useTranslate } from '@/i18n/provider';

interface VoicemailInteraction {
  id: string;
  startedAt: string;
  fromNumber: string | null;
  recordingUrl: string | null;
  transcript: string | null;
  lead: { id: string; name: string | null } | null;
}

export default function ClientVoicemailsPage() {
  const { t } = useTranslate();
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const { data: items = [], isLoading } = useQuery<VoicemailInteraction[]>({
    queryKey: ['client-voicemails', subAccountId],
    queryFn: () => apiClient.get<VoicemailInteraction[]>('/interactions?type=voicemail'),
    enabled: !!subAccountId,
  });

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">{t('clientVoicemails.title')}</h1>
        <p className="mt-1 text-muted-foreground">{items.length} {t('clientVoicemails.voiceMessages')}</p>
      </header>

      {isLoading && <p className="text-muted-foreground">{t('clientVoicemails.loading')}</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-muted-foreground">{t('clientVoicemails.empty')}</p>
      )}

      <div className="space-y-2">
        {items.map((v) => (
          <div key={v.id} className="rounded-md border p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Voicemail className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{v.fromNumber ?? '—'}</span>
                {v.lead?.name && <span className="text-xs text-muted-foreground">· {v.lead.name}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(v.startedAt).toLocaleString('pt-BR')}
                </span>
                {v.recordingUrl && <RecordingPlayer interactionId={v.id} />}
              </div>
            </div>
            {v.transcript && <p className="mt-2 text-sm text-muted-foreground">{v.transcript}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
