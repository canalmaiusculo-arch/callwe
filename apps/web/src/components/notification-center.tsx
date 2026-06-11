'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, UserPlus, PhoneMissed } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface Notif {
  id: string;
  kind: 'lead' | 'missed';
  source: string;
  title: string;
  subtitle: string;
  at: string;
}

const SEEN_KEY = 'callwe-notif-seen';

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function NotificationCenter() {
  const token = useAuthStore((s) => s.accessToken);
  const [active, setActive] = useState<Notif[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const ready = useRef(false);

  const playBell = useCallback(() => {
    try {
      const a = new Audio('/ring.mp3.mp3');
      a.volume = 0.4;
      void a.play().catch(() => {});
    } catch {
      /* autoplay bloqueado até interação — ignora */
    }
  }, []);

  const { data } = useQuery<Notif[]>({
    queryKey: ['notifications-recent'],
    queryFn: () => apiClient.get('/notifications/recent'),
    enabled: !!token,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    seen.current = loadSeen();
    ready.current = true;
  }, []);

  // Mostra notificações novas (que ainda não foram vistas) e toca o sino.
  useEffect(() => {
    if (!data || !ready.current) return;
    const fresh = data.filter((n) => !seen.current.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => seen.current.add(n.id));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current].slice(-300)));
    setActive((prev) => [...fresh, ...prev].slice(0, 6));
    playBell();
  }, [data, playBell]);

  // Enquanto houver notificação não vista, repete o sino de leve a cada 25s.
  useEffect(() => {
    if (active.length === 0) return;
    const id = setInterval(playBell, 25_000);
    return () => clearInterval(id);
  }, [active.length, playBell]);

  if (!token || active.length === 0) return null;

  const dismiss = (id: string) => setActive((prev) => prev.filter((n) => n.id !== id));

  return (
    <div className="fixed bottom-6 left-6 z-50 flex w-80 max-w-[90vw] flex-col gap-2">
      {active.map((n) => {
        const missed = n.kind === 'missed';
        const Icon = missed ? PhoneMissed : UserPlus;
        return (
          <div
            key={n.id}
            className={`flex items-start gap-3 rounded-lg border border-l-4 p-3 shadow-lg ${
              missed
                ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/40'
                : 'border-l-sky-400 bg-sky-50 dark:bg-sky-950/40'
            }`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${missed ? 'text-blue-600' : 'text-sky-600'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="truncate text-xs text-muted-foreground">{n.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(n.id)}
              className="rounded p-1 hover:bg-black/5"
              aria-label="Fechar"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
