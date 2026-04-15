'use client';

interface IncomingCallPanelProps {
  call: unknown;
}

export function IncomingCallPanel({ call }: IncomingCallPanelProps) {
  if (!call) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
        Aguardando chamadas...
      </div>
    );
  }

  const c = call as {
    from_number?: string;
    lead?: { name?: string; status?: string };
    briefing?: { businessSummary?: string };
  };

  return (
    <div className="space-y-4 p-6">
      <header>
        <p className="text-sm text-muted-foreground">Chamada entrante</p>
        <h2 className="text-2xl font-bold">{c.from_number ?? 'Número desconhecido'}</h2>
      </header>

      {c.lead && (
        <section className="rounded-md border p-4">
          <p className="text-xs uppercase text-muted-foreground">Lead</p>
          <p className="font-medium">{c.lead.name ?? '—'}</p>
          <p className="text-sm">Status: {c.lead.status}</p>
        </section>
      )}

      {c.briefing && (
        <section className="rounded-md border p-4">
          <p className="text-xs uppercase text-muted-foreground">Briefing do cliente</p>
          <p className="mt-1 text-sm">{c.briefing.businessSummary}</p>
        </section>
      )}
    </div>
  );
}
