'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface Briefing {
  businessSummary?: string;
  targetAudience?: string;
  keyServices?: string[];
  pricingGuidelines?: string;
  faq?: Array<{ q?: string; a?: string; question?: string; answer?: string }>;
  scripts?: { opening?: string; closing?: string; objectionHandling?: string };
  dosAndDonts?: Record<string, unknown>;
}

export function BriefingDisplay({ subAccountId }: { subAccountId: string | null | undefined }) {
  const { data: briefing, isLoading } = useQuery<Briefing | null>({
    queryKey: ['briefing', subAccountId],
    queryFn: () => apiClient.get(`/briefings/by-sub-account/${subAccountId}`),
    enabled: !!subAccountId,
  });

  if (!subAccountId) {
    return <p className="text-sm text-muted-foreground">Selecione um cliente.</p>;
  }
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando briefing...</p>;
  }
  if (!briefing) {
    return <p className="text-sm text-muted-foreground">Briefing não cadastrado pra esse cliente.</p>;
  }

  const dosDontsEntries = briefing.dosAndDonts ? Object.entries(briefing.dosAndDonts) : [];
  const hasDosDonts = dosDontsEntries.some(([, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    return false;
  });

  return (
    <div className="space-y-3">
      {briefing.businessSummary && (
        <BriefCard title="Sobre o cliente" tone="muted">
          <LinkifiedText text={briefing.businessSummary} />
        </BriefCard>
      )}
      {briefing.targetAudience && (
        <BriefCard title="Público-alvo" tone="muted">
          <LinkifiedText text={briefing.targetAudience} />
        </BriefCard>
      )}
      {briefing.keyServices && briefing.keyServices.length > 0 && (
        <BriefCard title="Serviços principais" tone="muted">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {briefing.keyServices.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </BriefCard>
      )}
      {briefing.pricingGuidelines && (
        <BriefCard title="Preços" tone="amber">
          <LinkifiedText text={briefing.pricingGuidelines} />
        </BriefCard>
      )}
      {briefing.scripts?.opening && (
        <BriefCard title="Script de abertura" tone="blue">
          <LinkifiedText text={briefing.scripts.opening} />
        </BriefCard>
      )}
      {briefing.scripts?.objectionHandling && (
        <BriefCard title="Lidando com objeções" tone="blue">
          <LinkifiedText text={briefing.scripts.objectionHandling} />
        </BriefCard>
      )}
      {briefing.scripts?.closing && (
        <BriefCard title="Script de fechamento" tone="blue">
          <LinkifiedText text={briefing.scripts.closing} />
        </BriefCard>
      )}
      {hasDosDonts && (
        <BriefCard title="Faça / Não faça" tone="muted">
          <div className="space-y-2 text-sm">
            {dosDontsEntries.map(([key, value]) => {
              const items = Array.isArray(value)
                ? (value as unknown[]).map((v) => String(v))
                : typeof value === 'string'
                  ? [value]
                  : [];
              if (items.length === 0) return null;
              return (
                <div key={key}>
                  <p className="font-medium capitalize">{key}</p>
                  <ul className="list-disc pl-5">
                    {items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </BriefCard>
      )}
      {briefing.faq && briefing.faq.length > 0 && (
        <BriefCard title={`FAQ (${briefing.faq.length})`} tone="muted">
          <div className="space-y-2 text-sm">
            {briefing.faq.map((item, i) => {
              const question = (item.q ?? item.question ?? '').trim();
              const answer = (item.a ?? item.answer ?? '').trim();
              if (!question && !answer) return null;
              return (
                <details key={i} className="rounded border bg-background p-2">
                  <summary className="cursor-pointer font-medium">{question || `Pergunta ${i + 1}`}</summary>
                  <div className="mt-1 pl-2">
                    <LinkifiedText text={answer} />
                  </div>
                </details>
              );
            })}
          </div>
        </BriefCard>
      )}
    </div>
  );
}

function BriefCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone: 'muted' | 'blue' | 'amber';
  children: React.ReactNode;
}) {
  const bg = tone === 'blue' ? 'bg-blue-50' : tone === 'amber' ? 'bg-amber-50' : 'bg-muted/30';
  return (
    <Card className={bg}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="whitespace-pre-wrap text-sm">
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-blue-600 underline"
          >
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}
