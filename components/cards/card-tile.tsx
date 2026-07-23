import Link from "next/link";
import { Repeat } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusProgress } from "@/components/cards/status-progress";
import { getCardTypeIcon } from "@/lib/utils/card-type-icons";
import { formatCurrencyBRL, nextRenewalDate } from "@/lib/utils/financeiro";
import { cardRecorrenciaLabel } from "@/lib/utils/recorrencia";
import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";

type SelectionProps = {
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
};

function SelectionCheckbox({ id, selected, onToggleSelect }: { id: string } & SelectionProps) {
  if (!onToggleSelect) return null;
  return (
    <span
      className="absolute top-2.5 right-2.5 z-10 flex size-6 items-center justify-center rounded-md bg-card/90"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleSelect(id);
      }}
    >
      <Checkbox checked={Boolean(selected)} />
    </span>
  );
}

function RecorrenciaBadge({ recorrencia }: { recorrencia: string | null }) {
  const label = cardRecorrenciaLabel(recorrencia);
  if (!label) return null;
  return (
    <span
      className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground"
      title={`Recorrência: ${label}`}
    >
      <Repeat className="size-3" />
      {label}
    </span>
  );
}

function FinanceiroCardTile({ card, selected, onToggleSelect }: { card: CardWithRelations } & SelectionProps) {
  const TypeIcon = getCardTypeIcon("financeiro");
  const details = card.financeiro_details;
  const renewal = details ? nextRenewalDate(details.data_inicio, details.recorrencia) : null;

  return (
    <div className="relative">
      <SelectionCheckbox id={card.id} selected={selected} onToggleSelect={onToggleSelect} />
      <Link
        href={`/cards/${card.id}`}
        className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent/40"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TypeIcon className="size-3.5" />
            Financeiro
          </span>
          {details ? (
            <span className="text-sm font-semibold text-foreground">{formatCurrencyBRL(details.valor)}</span>
          ) : null}
        </div>

        <h3 className="line-clamp-2 text-sm font-medium text-foreground">{card.title}</h3>

        <div className="mt-auto flex flex-col gap-1 text-[11px] text-muted-foreground">
          <span>{renewal ? `Renova em ${renewal.toLocaleDateString("pt-BR")}` : "Pagamento único"}</span>
          <span>Assinado por {details?.gasto_por?.full_name ?? "—"}</span>
        </div>
      </Link>
    </div>
  );
}

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

export function CardTile({
  card,
  allStatuses,
  selected,
  onToggleSelect,
}: {
  card: CardWithRelations;
  allStatuses: CardLookups["statuses"];
} & SelectionProps) {
  if (card.card_type?.key === "financeiro") {
    return <FinanceiroCardTile card={card} selected={selected} onToggleSelect={onToggleSelect} />;
  }

  const TypeIcon = getCardTypeIcon(card.card_type?.key);
  return (
    <div className="relative">
      <SelectionCheckbox id={card.id} selected={selected} onToggleSelect={onToggleSelect} />
      <Link
        href={`/cards/${card.id}`}
        className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent/40"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TypeIcon className="size-3.5" />
            {card.card_type?.label}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <RecorrenciaBadge recorrencia={card.recorrencia} />
            {card.status ? <StatusProgress status={card.status} allStatuses={allStatuses} /> : null}
          </div>
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

        {card.created_by_member ? (
          <p className="truncate text-[10px] text-muted-foreground/70">Criado por {card.created_by_member.full_name}</p>
        ) : null}
      </Link>
    </div>
  );
}
