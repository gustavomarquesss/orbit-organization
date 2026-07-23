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

// Fica dentro do fluxo normal do flex (nunca sobreposto/absoluto) para que o
// badge de status não seja empurrado por baixo dele em cards estreitos. A área
// de toque é bem maior que o quadradinho visual (~40px) para facilitar o toque
// no celular, com destaque visual ao tocar/passar o mouse.
function SelectionCheckbox({ id, selected, onToggleSelect }: { id: string } & SelectionProps) {
  if (!onToggleSelect) return null;
  return (
    <span
      role="checkbox"
      aria-checked={Boolean(selected)}
      className="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent active:bg-accent/70"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleSelect(id);
      }}
    >
      <Checkbox checked={Boolean(selected)} className="pointer-events-none" />
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
    <Link
      href={`/cards/${card.id}`}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:bg-accent/40 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
          <TypeIcon className="size-3.5 shrink-0" />
          <span className="truncate">Financeiro</span>
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {details ? (
            <span className="text-sm font-semibold text-foreground">{formatCurrencyBRL(details.valor)}</span>
          ) : null}
          <SelectionCheckbox id={card.id} selected={selected} onToggleSelect={onToggleSelect} />
        </div>
      </div>

      <h3 className="line-clamp-2 text-sm font-medium text-foreground">{card.title}</h3>

      <div className="mt-auto flex flex-col gap-1 text-[11px] text-muted-foreground">
        <span>{renewal ? `Renova em ${renewal.toLocaleDateString("pt-BR")}` : "Pagamento único"}</span>
        <span>Assinado por {details?.gasto_por?.full_name ?? "—"}</span>
      </div>
    </Link>
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
  const priorityColor = card.priority?.color;
  return (
    <Link
      href={`/cards/${card.id}`}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-shadow hover:bg-accent/40"
      style={
        priorityColor
          ? {
              borderColor: priorityColor,
              boxShadow: `0 4px 16px -6px ${priorityColor}66, 0 0 0 1px ${priorityColor}1a`,
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
          <TypeIcon className="size-3.5 shrink-0" />
          <span className="truncate">{card.card_type?.label}</span>
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <RecorrenciaBadge recorrencia={card.recorrencia} />
          {card.status ? <StatusProgress status={card.status} allStatuses={allStatuses} /> : null}
          <SelectionCheckbox id={card.id} selected={selected} onToggleSelect={onToggleSelect} />
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
  );
}
