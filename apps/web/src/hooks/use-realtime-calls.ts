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

function useJoinSubAccounts(subTags: string[]) {
  const tagsKey = subTags.join(',');
  useEffect(() => {
    const s = getSocket();
    const joinAll = () => {
      for (const tag of subTags) s.emit('join:sub-account', tag);
    };
    s.on('connect', joinAll);
    if (s.connected) joinAll();
    return () => {
      s.off('connect', joinAll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsKey]);
}

interface CallPayload {
  call_uuid?: string;
  call_id?: string;
  external_number?: string;
  from_number?: string;
  subAccountName?: string;
}

interface CallEndedPayload {
  call_uuid?: string;
}

export function useRealtimeCalls(subTags: string[]) {
  const [activeCall, setActiveCall] = useState<CallPayload | null>(null);
  useJoinSubAccounts(subTags);

  useEffect(() => {
    const s = getSocket();
    const onIncoming = (payload: CallPayload) => {
      setActiveCall(payload);
      notifyIncomingCall(payload);
    };
    const onEnded = (payload: CallEndedPayload) => {
      setActiveCall((prev) => {
        if (!prev) return null;
        const prevId = prev.call_uuid ?? prev.call_id;
        if (prevId && payload.call_uuid && prevId === payload.call_uuid) return null;
        return prev;
      });
    };
    s.on('call:incoming', onIncoming);
    s.on('call:ended', onEnded);
    return () => {
      s.off('call:incoming', onIncoming);
      s.off('call:ended', onEnded);
    };
  }, []);

  const dismiss = () => setActiveCall(null);
  return { activeCall, dismiss };
}

interface SmsPayload {
  message_id?: string;
  from_number?: string;
  to_number?: string;
  body?: string;
  subAccountName?: string;
}

export function useRealtimeSms(subTags: string[], onNew: (payload: SmsPayload) => void) {
  useJoinSubAccounts(subTags);

  useEffect(() => {
    const s = getSocket();
    const handler = (payload: SmsPayload) => {
      onNew(payload);
      playSmsBeep();
    };
    s.on('sms:received', handler);
    return () => {
      s.off('sms:received', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function playSmsBeep() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close();
  } catch {
    // ignore
  }
}

function notifyIncomingCall(call: CallPayload) {
  if (typeof window === 'undefined') return;

  try {
    const audio = new Audio('/ring.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {
      // Navegador bloqueou autoplay — precisa interação do usuário antes
    });
  } catch {
    // ignore
  }

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
