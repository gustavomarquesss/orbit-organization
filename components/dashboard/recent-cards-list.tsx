import Link from "next/link";

import { formatRelative } from "@/lib/utils/dates";
import type { RecentCard } from "@/lib/queries/dashboard";

export function RecentCardsList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: RecentCard[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/cards/${item.id}`}
                className="flex items-center justify-between gap-2 text-sm hover:underline"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span>{item.card_type?.emoji}</span>
                  <span className="truncate">{item.title}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(item.timestamp)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
