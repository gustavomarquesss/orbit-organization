import type { StatusDistributionItem } from "@/lib/queries/dashboard";

const SIZE = 176;
const STROKE = 28;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = CIRCUMFERENCE * 0.012;

export function StatusPieChart({ items }: { items: StatusDistributionItem[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const visible = items.filter((item) => item.count > 0);

  const fractions = visible.map((item) => item.count / total);
  const prefixSums = fractions.reduce<number[]>((acc, fraction, i) => {
    const before = i === 0 ? 0 : acc[i - 1];
    return [...acc, before + fraction * CIRCUMFERENCE];
  }, []);
  const segments = visible.map((item, i) => {
    const fraction = fractions[i];
    const length = Math.max(fraction * CIRCUMFERENCE - (visible.length > 1 ? GAP : 0), 0);
    const cumulative = i === 0 ? 0 : prefixSums[i - 1];
    return { ...item, length, dashoffset: -cumulative, pct: Math.round(fraction * 100) };
  });

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">Distribuição por Status</h3>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum card para exibir.</p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-around">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={STROKE}
            />
            {segments.map((seg) => (
              <circle
                key={seg.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeDasharray={`${seg.length} ${CIRCUMFERENCE - seg.length}`}
                strokeDashoffset={seg.dashoffset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              >
                <title>{`${seg.label}: ${seg.count} (${seg.pct}%)`}</title>
              </circle>
            ))}
            <text
              x={SIZE / 2}
              y={SIZE / 2 - 6}
              textAnchor="middle"
              className="fill-foreground text-2xl font-semibold"
            >
              {total}
            </text>
            <text
              x={SIZE / 2}
              y={SIZE / 2 + 16}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              Total
            </text>
          </svg>

          <ul className="w-full space-y-2.5 sm:w-auto sm:min-w-40">
            {items.map((item) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {item.count} · {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
