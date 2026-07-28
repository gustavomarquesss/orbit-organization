import { Trophy } from "lucide-react";

import type { RankingItem } from "@/lib/queries/dashboard";
import { cn } from "@/lib/utils";

const POSITION_LABELS = ["1º", "2º", "3º"];

function RankingRow({ item }: { item: RankingItem }) {
  const positionLabel = POSITION_LABELS[item.position - 1] ?? `${item.position}º`;
  const caption =
    item.position === 1
      ? item.count > 0
        ? "líder do mês"
        : "ninguém concluiu tarefas este mês ainda"
      : item.gapToAbove > 0
        ? `faltam ${item.gapToAbove} para alcançar o ${POSITION_LABELS[item.position - 2] ?? `${item.position - 1}º`}`
        : `empatado com o ${POSITION_LABELS[item.position - 2] ?? `${item.position - 1}º`}`;

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          item.position === 1
            ? "bg-amber-400/20 text-amber-600 dark:text-amber-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        {positionLabel}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-medium">{item.label}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{item.count} tarefas</span>
        </div>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}

export function RankingList({ items, monthLabel }: { items: RankingItem[]; monthLabel: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
        <Trophy className="size-4 text-muted-foreground" />
        Ranking do mês
        <span className="ml-auto text-xs font-normal text-muted-foreground">{monthLabel}</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum membro da equipe cadastrado.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <RankingRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
