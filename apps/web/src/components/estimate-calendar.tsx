'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CalendarDays, Phone, DollarSign } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/i18n/provider';

export interface Estimate {
  id: string;
  name: string | null;
  phoneE164: string | null;
  email: string | null;
  status: string;
  estimateValue: string | null;
  scheduledEstimateAt: string | null;
  subAccount: { id: string; name: string } | null;
}

type View = 'week' | 'month';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function EstimateCalendar({
  extraParams = '',
  onOpen,
}: {
  extraParams?: string;
  onOpen: (e: Estimate) => void;
}) {
  const { t } = useTranslate();
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));

  // Intervalo visível (semana começa no domingo; mês com spillover de 6 semanas).
  const range = useMemo(() => {
    if (view === 'week') {
      const start = addDays(anchor, -anchor.getDay());
      return { start, end: addDays(start, 7), days: Array.from({ length: 7 }, (_, i) => addDays(start, i)) };
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = addDays(first, -first.getDay());
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    return { start: gridStart, end: addDays(gridStart, 42), days };
  }, [view, anchor]);

  const { data: estimates = [] } = useQuery<Estimate[]>({
    queryKey: ['calendar-estimates', view, anchor.toISOString(), extraParams],
    queryFn: () => {
      const p = new URLSearchParams({ from: range.start.toISOString(), to: range.end.toISOString() });
      const qs = extraParams ? `${p.toString()}&${extraParams}` : p.toString();
      return apiClient.get(`/calendar/estimates?${qs}`);
    },
    refetchInterval: 60_000,
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Estimate[]>();
    for (const e of estimates) {
      if (!e.scheduledEstimateAt) continue;
      const k = dayKey(new Date(e.scheduledEstimateAt));
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    return map;
  }, [estimates]);

  const nav = (dir: number) => setAnchor((a) => (view === 'week' ? addDays(a, dir * 7) : new Date(a.getFullYear(), a.getMonth() + dir, 1)));
  const title =
    view === 'week'
      ? `${range.days[0]!.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${range.days[6]!.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
      : anchor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const weekdays = [t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')];
  const today = startOfDay(new Date());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => nav(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setAnchor(startOfDay(new Date()))}>{t('calendar.today')}</Button>
          <Button size="sm" variant="outline" onClick={() => nav(1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-1 text-sm font-semibold capitalize">{title}</span>
          <span className="text-xs text-muted-foreground">({estimates.length})</span>
        </div>
        <div className="flex rounded-md border p-0.5">
          <button onClick={() => setView('week')} className={`rounded px-3 py-1 text-xs font-medium ${view === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('calendar.week')}</button>
          <button onClick={() => setView('month')} className={`rounded px-3 py-1 text-xs font-medium ${view === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('calendar.month')}</button>
        </div>
      </div>

      {view === 'week' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {range.days.map((d) => {
            const items = byDay.get(dayKey(d)) ?? [];
            const isToday = sameDay(d, today);
            return (
              <div key={dayKey(d)} className={`rounded-lg border p-2 ${isToday ? 'border-primary bg-primary/5' : ''}`}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                  {weekdays[d.getDay()]} {d.getDate()}
                </p>
                <div className="space-y-1.5">
                  {items.length === 0 && <p className="text-[11px] text-muted-foreground/60">—</p>}
                  {items.map((e) => <EstimateChip key={e.id} e={e} onClick={() => onOpen(e)} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-7 bg-muted/40 text-center text-[11px] font-semibold uppercase text-muted-foreground">
            {weekdays.map((w) => <div key={w} className="py-1.5">{w}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {range.days.map((d) => {
              const items = byDay.get(dayKey(d)) ?? [];
              const isToday = sameDay(d, today);
              const otherMonth = d.getMonth() !== anchor.getMonth();
              return (
                <div key={dayKey(d)} className={`min-h-[86px] border-b border-r p-1 ${otherMonth ? 'bg-muted/20' : ''}`}>
                  <p className={`text-right text-[11px] ${isToday ? 'font-bold text-primary' : otherMonth ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>{d.getDate()}</p>
                  <div className="mt-0.5 space-y-1">
                    {items.slice(0, 3).map((e) => <EstimateChip key={e.id} e={e} onClick={() => onOpen(e)} compact />)}
                    {items.length > 3 && <p className="text-[10px] text-muted-foreground">+{items.length - 3}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {estimates.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
          <CalendarDays className="mb-2 h-8 w-8 opacity-30" />
          {t('calendar.empty')}
        </div>
      )}
    </div>
  );
}

function EstimateChip({ e, onClick, compact }: { e: Estimate; onClick: () => void; compact?: boolean }) {
  const time = e.scheduledEstimateAt
    ? new Date(e.scheduledEstimateAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';
  return (
    <button
      onClick={onClick}
      className="w-full rounded-md border border-emerald-200 bg-emerald-50 p-1.5 text-left transition-colors hover:bg-emerald-100"
    >
      <p className="truncate text-xs font-medium text-emerald-900">
        {time && <span className="mr-1 font-semibold">{time}</span>}
        {e.name ?? e.phoneE164 ?? '—'}
      </p>
      {!compact && (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-emerald-700">
          {e.phoneE164 && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{e.phoneE164}</span>}
          {e.estimateValue && <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" />{e.estimateValue}</span>}
        </div>
      )}
      {!compact && e.subAccount && <p className="truncate text-[10px] text-emerald-600/70">{e.subAccount.name}</p>}
    </button>
  );
}
