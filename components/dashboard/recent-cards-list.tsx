import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { formatRelative } from "@/lib/utils/dates";
import { getCardTypeIcon } from "@/lib/utils/card-type-icons";
import type { RecentCard } from "@/lib/queries/dashboard";

export function RecentCardsList({
  title,
  icon: Icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: LucideIcon;
  items: RecentCard[];
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const TypeIcon = getCardTypeIcon(item.card_type?.key);
            return (
              <li key={item.id}>
                <Link
                  href={`/cards/${item.id}`}
                  className="flex items-center justify-between gap-2 text-sm hover:underline"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <TypeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{item.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(item.timestamp)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
