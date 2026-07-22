import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import type { BreakdownItem } from "@/lib/queries/dashboard";

function BreakdownRow({ item, max }: { item: BreakdownItem; max: number }) {
  const pct = Math.max(4, Math.round((item.count / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate">{item.label}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{item.count}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BreakdownList({
  title,
  icon: Icon,
  items,
  emptyLabel,
  href,
}: {
  title: string;
  icon: LucideIcon;
  items: BreakdownItem[];
  emptyLabel: string;
  href?: (id: string) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) =>
            href ? (
              <li key={item.id}>
                <Link href={href(item.id)} className="block transition-opacity hover:opacity-80">
                  <BreakdownRow item={item} max={max} />
                </Link>
              </li>
            ) : (
              <li key={item.id}>
                <BreakdownRow item={item} max={max} />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
