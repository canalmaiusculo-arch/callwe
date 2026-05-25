'use client';

import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function RecordingPlayer({
  interactionId,
  subAccountId: subAccountIdProp,
}: {
  interactionId: string;
  /** Sobrescreve o subAccountId do tenant store. Use quando o componente
   *  for renderizado fora de um contexto que setou o tenant (ex: /agent). */
  subAccountId?: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.accessToken);
  const tenantSubAccountId = useTenantStore((s) => s.subAccountId);
  const subAccountId = subAccountIdProp ?? tenantSubAccountId;

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  async function load() {
    if (!token) {
      setError('Não autenticado');
      return;
    }
    if (!subAccountId) {
      setError('Sub-conta não identificada (recarregue a interação)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/interactions/${interactionId}/recording`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Sub-Account-Id': subAccountId,
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${text ? ` — ${text.slice(0, 200)}` : ''}`);
      }
      const blob = await res.blob();
      if (blob.size === 0) throw new Error('Arquivo vazio no R2');
      setBlobUrl(URL.createObjectURL(blob));
    } catch (err) {
      const msg = (err as Error).message ?? 'Erro ao carregar gravação';
      setError(msg);
      console.error('RecordingPlayer:', msg);
    } finally {
      setLoading(false);
    }
  }

  if (!blobUrl) {
    return (
      <div className="space-y-1">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <Play className="h-4 w-4" />
          {loading ? 'Carregando...' : 'Ouvir'}
        </Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <audio
      controls
      className="w-full"
      src={blobUrl}
      autoPlay
      onError={(e) => {
        const el = e.currentTarget;
        const code = el.error?.code;
        setError(`Browser não consegue tocar (code ${code}). Pode ser codec WAV não suportado.`);
        setBlobUrl(null);
      }}
    />
  );
}
