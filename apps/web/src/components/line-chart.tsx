'use client';

import { useState } from 'react';

function fmtDay(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  return m ? `${m[3]}/${m[2]}` : day;
}

export function MiniLineChart({
  data,
  height = 80,
  color = '#3b82f6',
}: {
  data: Array<{ day: string; count: number }>;
  height?: number;
  color?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>
        —
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 300;
  const h = height;
  const n = data.length;
  const sx = (i: number) => (n > 1 ? (i / (n - 1)) * w : w / 2);
  const sy = (c: number) => h - (c / max) * (h - 20) - 10;

  const pts = data.map((d, i) => ({
    xPct: n > 1 ? (i / (n - 1)) * 100 : 50,
    y: sy(d.count),
    day: d.day,
    count: d.count,
  }));

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(d.count)}`).join(' ');
  const areaPath = `${linePath} L ${sx(n - 1)} ${h} L ${sx(0)} ${h} Z`;
  const active = hover != null ? pts[hover] : null;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    const idx = n > 1 ? Math.round(rel * (n - 1)) : 0;
    setHover(Math.max(0, Math.min(n - 1, idx)));
  }

  return (
    <div className="relative" style={{ height }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
        <path d={areaPath} fill={color} opacity="0.12" />
        <path d={linePath} stroke={color} strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Linha-guia vertical no ponto ativo */}
      {active && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px"
          style={{ left: `${active.xPct}%`, background: color, opacity: 0.25 }}
        />
      )}

      {/* Pontos (HTML, sempre redondos) */}
      {pts.map((p, i) => (
        <div
          key={i}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${p.xPct}%`,
            top: p.y,
            width: hover === i ? 11 : 6,
            height: hover === i ? 11 : 6,
            background: hover === i ? '#fff' : color,
            border: `2px solid ${color}`,
            boxSizing: 'border-box',
          }}
        />
      ))}

      {/* Tooltip */}
      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs shadow-md"
          style={{ left: `${active.xPct}%`, top: active.y - 8 }}
        >
          <span className="font-semibold">{active.count}</span>
          <span className="ml-1 text-muted-foreground">· {fmtDay(active.day)}</span>
        </div>
      )}
    </div>
  );
}
