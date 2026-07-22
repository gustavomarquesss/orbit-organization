import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ColorBadge } from "@/components/cards/color-badge";
import type { CardWithRelations } from "@/lib/queries/cards";

export function CardTile({ card }: { card: CardWithRelations }) {
  return (
    <Link
      href={`/cards/${card.id}`}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{card.card_type?.emoji}</span>
          {card.card_type?.label}
        </span>
        {card.status ? <ColorBadge label={card.status.label} color={card.status.color} /> : null}
      </div>

      <h3 className="line-clamp-2 text-sm font-medium text-foreground">{card.title}</h3>

      {card.description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{card.description}</p>
      ) : null}

      {card.card_tags?.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {card.card_tags.slice(0, 3).map(({ tag }) =>
            tag ? (
              <Badge key={tag.id} variant="secondary" className="text-[10px]">
                {tag.name}
              </Badge>
            ) : null,
          )}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
        <span className="truncate">{card.responsavel?.full_name ?? "Sem responsável"}</span>
        {card.modelo ? <span className="shrink-0">{card.modelo.name}</span> : null}
      </div>
    </Link>
  );
}
