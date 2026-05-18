'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Tracking client-side de itens já visualizados, persistido em localStorage.
 * Usado pra mostrar bolinha "não lido" em SMS e calls sem status trabalhado.
 *
 * - `scope`: chave de storage (ex: "sms-seen")
 * - `cap`: limite máximo de IDs no set (mais antigos vão sendo descartados)
 */
export function useSeenIds(scope: string, cap = 2000) {
  const [seen, setSeen] = useState<Set<string>>(() => loadSet(scope));

  // Sync entre tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(scope)) setSeen(loadSet(scope));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [scope]);

  const markSeen = useCallback(
    (id: string) => {
      setSeen((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        if (next.size > cap) {
          const arr = Array.from(next);
          arr.splice(0, next.size - cap);
          const trimmed = new Set(arr);
          saveSet(scope, trimmed);
          return trimmed;
        }
        saveSet(scope, next);
        return next;
      });
    },
    [scope, cap],
  );

  const isSeen = useCallback((id: string) => seen.has(id), [seen]);

  return { isSeen, markSeen };
}

function storageKey(scope: string) {
  return `callwe-seen-${scope}`;
}

function loadSet(scope: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveSet(scope: string, set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(Array.from(set)));
  } catch {
    // ignore quota errors
  }
}
