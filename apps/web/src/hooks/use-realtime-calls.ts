'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    socket = io(`${url}/realtime`, { transports: ['websocket'] });
  }
  return socket;
}

interface CallPayload {
  external_number?: string;
  from_number?: string;
  subAccountName?: string;
}

export function useRealtimeCalls(subTags: string[]) {
  const [incoming, setIncoming] = useState<unknown>(null);
  const tagsKey = subTags.join(',');

  useEffect(() => {
    const s = getSocket();
    const handler = (payload: unknown) => {
      setIncoming(payload);
      notifyIncomingCall(payload as CallPayload);
    };
    const joinAll = () => {
      for (const tag of subTags) s.emit('join:sub-account', tag);
    };

    s.on('call:incoming', handler);
    s.on('connect', joinAll);
    if (s.connected) joinAll();

    return () => {
      s.off('call:incoming', handler);
      s.off('connect', joinAll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsKey]);

  return incoming;
}

function notifyIncomingCall(call: CallPayload) {
  if (typeof window === 'undefined') return;

  // Toca som
  try {
    const audio = new Audio('/ring.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {
      // Navegador bloqueou autoplay — precisa interação do usuário antes
    });
  } catch {
    // ignore
  }

  // Notificação browser
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const number = call.external_number ?? call.from_number ?? 'Número desconhecido';
  const title = `📞 Chamada entrante ${call.subAccountName ? `— ${call.subAccountName}` : ''}`;

  const n = new Notification(title, {
    body: number,
    icon: '/favicon.ico',
    tag: 'incoming-call',
    requireInteraction: true,
  });

  n.onclick = () => {
    window.focus();
    n.close();
  };
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  return Notification.permission;
}
