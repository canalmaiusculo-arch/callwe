'use client';

import { useQuery } from '@tanstack/react-query';
import { Voicemail } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';
import { RecordingPlayer } from '@/components/recording-player';

interface VoicemailInteraction {
  id: string;
  startedAt: string;
  fromNumber: string | null;
  recordingUrl: string | null;
  transcript: string | null;
  lead: { id: string; name: string | null } | null;
}

export default function ClientVoicemailsPage() {
  const subAccountId = useTenantStore((s) => s.subAccountId);
  const { data: items = [], isLoading } = useQuery<VoicemailInteraction[]>({
    queryKey: ['client-voicemails', subAccountId],
    queryFn: () => apiClient.get<VoicemailInteraction[]>('/interactions?type=voicemail'),
    enabled: !!subAccountId,
  });

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Meus voicemails</h1>
        <p className="mt-1 text-muted-foreground">{items.length} mensagens de voz</p>
      </header>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-muted-foreground">Nenhum voicemail ainda.</p>
      )}

      <div className="space-y-2">
        {items.map((v) => (
          <div key={v.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
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
