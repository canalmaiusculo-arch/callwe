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

export function useRealtimeCalls() {
  const [incoming, setIncoming] = useState<unknown>(null);

  useEffect(() => {
    const s = getSocket();
    const handler = (payload: unknown) => setIncoming(payload);
    s.on('call:incoming', handler);
    return () => {
      s.off('call:incoming', handler);
    };
  }, []);

  return incoming;
}
