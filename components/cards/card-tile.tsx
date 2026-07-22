import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ColorBadge } from "@/components/cards/color-badge";
import { getCardTypeIcon } from "@/lib/utils/card-type-icons";
import type { CardWithRelations } from "@/lib/queries/cards";

function formatResponsaveis(card: CardWithRelations): string {
  const names = card.card_responsaveis
    .map((cr) => cr.team_member?.full_name)
    .filter((name): name is string => Boolean(name));
  if (names.length === 0) return "Sem responsável";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function formatModelos(card: CardWithRelations): string {
  const names = card.card_modelos.map((cm) => cm.modelo?.name).filter((name): name is string => Boolean(name));
  if (names.length === 0) return "";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export function CardTile({ card }: { card: CardWithRelations }) {
  const TypeIcon = getCardTypeIcon(card.card_type?.key);
  return (
    <Link
      href={`/cards/${card.id}`}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TypeIcon className="size-3.5" />
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
        <span className="truncate">{formatResponsaveis(card)}</span>
        {formatModelos(card) ? <span className="shrink-0 truncate">{formatModelos(card)}</span> : null}
      </div>
    </Link>
  );
}
