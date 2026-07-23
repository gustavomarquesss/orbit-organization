"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Repeat } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusProgress } from "@/components/cards/status-progress";
import { renderCardTypeIcon } from "@/lib/utils/card-type-icons";
import { cardRecorrenciaLabel } from "@/lib/utils/recorrencia";
import { getCardAccentColor } from "@/lib/utils/card-accent";
import { formatPrazo, isPrazoVencido } from "@/lib/utils/prazo";
import { sinkConcluido } from "@/lib/utils/card-sort";
import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";

type SortKey =
  | "title"
  | "tipo"
  | "status"
  | "prioridade"
  | "responsavel"
  | "modelo"
  | "prazo"
  | "criado_por"
  | "editado_por"
  | "updated_at";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "title", label: "Título" },
  { key: "tipo", label: "Tipo" },
  { key: "status", label: "Status" },
  { key: "prioridade", label: "Prioridade" },
  { key: "responsavel", label: "Responsável" },
  { key: "modelo", label: "Modelo" },
  { key: "prazo", label: "Prazo" },
  { key: "criado_por", label: "Criado por" },
  { key: "editado_por", label: "Editado por" },
  { key: "updated_at", label: "Atualizado" },
];

function responsaveisLabel(card: CardWithRelations): string {
  return card.card_responsaveis
    .map((cr) => cr.team_member?.full_name)
    .filter((name): name is string => Boolean(name))
    .join(", ");
}

function modelosLabel(card: CardWithRelations): string {
  return card.card_modelos
    .map((cm) => cm.modelo?.name)
    .filter((name): name is string => Boolean(name))
    .join(", ");
}

function fieldValue(card: CardWithRelations, key: SortKey): string {
  switch (key) {
    case "title":
      return card.title;
    case "tipo":
      return card.card_type?.label ?? "";
    case "status":
      return card.status?.label ?? "";
    case "prioridade":
      return card.priority?.label ?? "";
    case "responsavel":
      return responsaveisLabel(card);
    case "modelo":
      return modelosLabel(card);
    case "prazo":
      return card.prazo_data ? `${card.prazo_data} ${card.prazo_hora ?? ""}` : "";
    case "criado_por":
      return card.created_by_member?.full_name ?? "";
    case "editado_por":
      return card.updated_by_member?.full_name ?? "";
    case "updated_at":
      return card.updated_at;
  }
}

export function CardListTable({
  cards,
  allStatuses,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  cards: CardWithRelations[];
  allStatuses: CardLookups["statuses"];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  const sorted = sinkConcluido(
    [...cards].sort((a, b) => fieldValue(a, sortKey).localeCompare(fieldValue(b, sortKey)) * sortDir),
  );
  const selectable = Boolean(onToggleSelect);
  const allSelected = Boolean(selectedIds) && sorted.length > 0 && sorted.every((c) => selectedIds!.has(c.id));

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable ? (
              <TableHead
                className="w-8 cursor-pointer"
                onClick={() => onToggleSelectAll?.(sorted.map((c) => c.id))}
              >
                <span className="flex size-8 items-center justify-center">
                  <Checkbox checked={allSelected} className="pointer-events-none" />
                </span>
              </TableHead>
            ) : null}
            {COLUMNS.map((col) => (
              <TableHead key={col.key} className="cursor-pointer select-none" onClick={() => sortBy(col.key)}>
                {col.label}
                {sortKey === col.key ? (sortDir === 1 ? " ▲" : " ▼") : ""}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((card) => {
            const recorrenciaLabel = cardRecorrenciaLabel(card.recorrencia);
            const accentColor = getCardAccentColor(card);
            return (
            <TableRow
              key={card.id}
              className="cursor-pointer"
              onClick={() => router.push(`/cards/${card.id}`)}
              style={accentColor ? { borderLeft: `3px solid ${accentColor}` } : undefined}
            >
              {selectable ? (
                <TableCell
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect?.(card.id);
                  }}
                >
                  <span className="flex size-8 items-center justify-center">
                    <Checkbox checked={selectedIds?.has(card.id) ?? false} className="pointer-events-none" />
                  </span>
                </TableCell>
              ) : null}
              <TableCell className="font-medium">
                <span className="flex items-center gap-1.5">
                  {renderCardTypeIcon(card.card_type?.key, "size-3.5 shrink-0 text-muted-foreground")}
                  {card.title}
                  {recorrenciaLabel ? (
                    <span title={`Recorrência: ${recorrenciaLabel}`}>
                      <Repeat className="size-3 shrink-0 text-muted-foreground" />
                    </span>
                  ) : null}
                </span>
              </TableCell>
              <TableCell>{card.card_type?.label}</TableCell>
              <TableCell>
                {card.status ? <StatusProgress status={card.status} allStatuses={allStatuses} /> : null}
              </TableCell>
              <TableCell>{card.priority?.label}</TableCell>
              <TableCell>{responsaveisLabel(card) || "—"}</TableCell>
              <TableCell>{modelosLabel(card) || "—"}</TableCell>
              <TableCell
                className={`text-xs ${isPrazoVencido(card) ? "font-medium text-destructive" : "text-muted-foreground"}`}
              >
                {formatPrazo(card) ? (
                  <span className="flex items-center gap-1">
                    <CalendarClock className="size-3 shrink-0" />
                    {formatPrazo(card)}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{card.created_by_member?.full_name ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{card.updated_by_member?.full_name ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(card.updated_at).toLocaleDateString("pt-BR")}
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
