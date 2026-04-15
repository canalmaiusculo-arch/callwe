'use client';

import { useQuery } from '@tanstack/react-query';
import { Voicemail } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface VoicemailInteraction {
  id: string;
  startedAt: string;
  fromNumber: string | null;
  recordingUrl: string | null;
  transcript: string | null;
}

export default function VoicemailsPage() {
  const { data: items = [], isLoading } = useQuery<VoicemailInteraction[]>({
    queryKey: ['voicemails'],
    queryFn: () => apiClient.get<VoicemailInteraction[]>('/interactions?type=voicemail'),
  });

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Voicemails</h1>
        <p className="mt-1 text-muted-foreground">{items.length} mensagens</p>
      </header>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      <div className="space-y-2">
        {items.map((v) => (
          <div key={v.id} className="rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Voicemail className="h-5 w-5 text-amber-600" />
              <span className="font-mono text-sm">{v.fromNumber}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(v.startedAt).toLocaleString('pt-BR')}
              </span>
            </div>
            {v.recordingUrl && <audio controls className="mt-3 w-full" src={v.recordingUrl} />}
            {v.transcript && (
              <p className="mt-2 rounded bg-muted/40 p-2 text-xs italic">{v.transcript}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
