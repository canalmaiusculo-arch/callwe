'use client';

import { useTranslate } from '@/i18n/provider';

interface TTDetail {
  question?: string;
  answer?: string;
}
interface TTEstimate {
  type?: string;
  total?: string;
}

/** Normaliza os dados do Thumbtack de qualquer formato salvo (`thumbtack` novo ou `data` legado). */
function pick(cf: Record<string, unknown>) {
  const tt = (cf.thumbtack ?? {}) as Record<string, unknown>;
  const data = (cf.data ?? {}) as Record<string, unknown>;
  const req = (data.request ?? {}) as Record<string, unknown>;
  const cat = (req.category ?? {}) as Record<string, unknown>;
  const biz = (data.business ?? tt.business ?? {}) as Record<string, unknown>;
  return {
    service: (tt.category as string) ?? (cat.name as string) ?? null,
    description: (tt.description as string) ?? (req.description as string) ?? null,
    details: ((tt.details ?? req.details) as TTDetail[] | undefined) ?? [],
    estimate: (tt.estimate ?? data.estimate) as TTEstimate | undefined,
    leadPrice: (tt.leadPrice as string) ?? (data.leadPrice as string) ?? null,
    business: (biz.name as string) ?? null,
  };
}

export function thumbtackHasData(cf: Record<string, unknown> | null | undefined): boolean {
  return !!(cf && (cf.thumbtack || cf.data));
}

export function ThumbtackDetails({ customFields }: { customFields: Record<string, unknown> | null | undefined }) {
  const { t } = useTranslate();
  if (!customFields) return null;
  const d = pick(customFields);

  return (
    <div className="space-y-3">
      {d.service && (
        <div>
          <p className="text-[11px] uppercase text-muted-foreground">{t('thumbtack.service')}</p>
          <p className="text-sm font-medium">{d.service}</p>
        </div>
      )}
      {d.description && (
        <div>
          <p className="text-[11px] uppercase text-muted-foreground">{t('thumbtack.request')}</p>
          <p className="text-sm">{d.description}</p>
        </div>
      )}

      {d.details.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] uppercase text-muted-foreground">{t('thumbtack.details')}</p>
          <div className="space-y-1.5">
            {d.details.map((it, i) => (
              <div key={i} className="rounded-md bg-muted/40 p-2">
                <p className="text-[11px] font-medium text-muted-foreground">{it.question}</p>
                <p className="text-sm">{it.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {d.leadPrice && (
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">{t('thumbtack.leadPrice')}</p>
            <p className="text-sm font-medium text-emerald-700">{d.leadPrice}</p>
          </div>
        )}
        {d.estimate?.total && d.estimate.total !== 'N/A' && (
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">{t('thumbtack.estimate')}</p>
            <p className="text-sm">
              {d.estimate.total}
              {d.estimate.type && d.estimate.type !== 'MoreInfo' ? ` (${d.estimate.type})` : ''}
            </p>
          </div>
        )}
        {d.business && (
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">{t('thumbtack.business')}</p>
            <p className="text-sm">{d.business}</p>
          </div>
        )}
      </div>
    </div>
  );
}
