'use client';

import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function RecordingPlayer({ interactionId }: { interactionId: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.accessToken);
  const subAccountId = useTenantStore((s) => s.subAccountId);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  async function load() {
    if (!token || !subAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/interactions/${interactionId}/recording`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Sub-Account-Id': subAccountId,
        },
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const blob = await res.blob();
      setBlobUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!blobUrl) {
    return (
      <Button size="sm" variant="outline" onClick={load} disabled={loading}>
        <Play className="h-4 w-4" />
        {loading ? 'Carregando...' : 'Ouvir'}
      </Button>
    );
  }

  return <audio controls className="w-full" src={blobUrl} autoPlay />;
}
