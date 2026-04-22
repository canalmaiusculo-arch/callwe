'use client';

export function MiniLineChart({
  data,
  height = 80,
  color = '#3b82f6',
}: {
  data: Array<{ day: string; count: number }>;
  height?: number;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>
        Sem dados
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 300;
  const h = height;
  const stepX = data.length > 1 ? w / (data.length - 1) : w;
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = h - (d.count / max) * (h - 20) - 10;
    return { x, y, day: d.day, count: d.count };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const areaPath = `${linePath} L ${last.x} ${h} L ${first.x} ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <path d={areaPath} fill={color} opacity="0.12" />
      <path d={linePath} stroke={color} strokeWidth="2" fill="none" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill={color} />
          <title>
            {p.day}: {p.count}
          </title>
        </g>
      ))}
    </svg>
  );
}
