'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestNotificationPermission, getNotificationPermission } from '@/hooks/use-realtime-calls';

export function NotificationBanner() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  async function enable() {
    const ok = await requestNotificationPermission();
    setPermission(ok ? 'granted' : 'denied');
  }

  if (permission === null) return null; // navegador sem suporte
  if (permission === 'granted') return null;

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <BellOff className="h-4 w-4" />
        <span>
          Notificações bloqueadas. Habilite nas configurações do navegador para receber alertas de chamadas entrantes.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
      <div className="flex items-center gap-2 text-blue-800">
        <Bell className="h-4 w-4" />
        <span>Ative notificações para não perder chamadas entrantes.</span>
      </div>
      <Button size="sm" onClick={enable}>
        Ativar
      </Button>
    </div>
  );
}
