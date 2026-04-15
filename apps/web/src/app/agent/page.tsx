'use client';

import { useEffect, useState } from 'react';
import { SoftphoneFrame } from '@/components/agent/softphone-frame';
import { IncomingCallPanel } from '@/components/agent/incoming-call-panel';
import { useRealtimeCalls } from '@/hooks/use-realtime-calls';

export default function AgentPage() {
  const [activeCall, setActiveCall] = useState<unknown>(null);
  const incoming = useRealtimeCalls();

  useEffect(() => {
    if (incoming) setActiveCall(incoming);
  }, [incoming]);

  return (
    <main className="grid min-h-screen grid-cols-12 gap-4 p-4">
      <section className="col-span-8 rounded-lg border">
        <IncomingCallPanel call={activeCall} />
      </section>
      <aside className="col-span-4">
        <SoftphoneFrame />
      </aside>
    </main>
  );
}
