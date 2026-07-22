import Link from "next/link";

import { formatRelative } from "@/lib/utils/dates";
import type { StaleCard } from "@/lib/queries/dashboard";

export function StaleCardsList({ cards }: { cards: StaleCard[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">Cards parados há mais tempo</h3>
      {cards.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum card em aberto.</p>
      ) : (
        <ul className="space-y-2">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                href={`/cards/${card.id}`}
                className="flex items-center justify-between gap-2 text-sm hover:underline"
              >
                <span className="min-w-0 truncate">{card.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(card.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
