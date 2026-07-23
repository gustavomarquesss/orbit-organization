"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardTile } from "@/components/cards/card-tile";
import { CardListTable } from "@/components/cards/card-list-table";
import { FilterBar } from "@/components/cards/filter-bar";
import { ViewToggle } from "@/components/cards/view-toggle";
import { useQuickAddCard } from "@/components/cards/card-quick-add-provider";
import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";

export function CardsExplorer({
  cards,
  lookups,
  view,
  newCardLabel = "Novo Card",
  lockedCardTypeId,
}: {
  cards: CardWithRelations[];
  lookups: CardLookups;
  view: "grid" | "list";
  newCardLabel?: string;
  lockedCardTypeId?: string;
}) {
  const openCreate = useQuickAddCard();
  const handleOpenCreate = () => openCreate({ lockedCardTypeId, title: newCardLabel });

  return (
    <>
      <FilterBar lookups={lookups} />

      <div className="mb-4 flex items-center justify-between gap-2">
        <ViewToggle />
        <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
          <Plus className="size-4" />
          {newCardLabel}
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          <p>Nenhum card encontrado.</p>
          <Button variant="link" onClick={handleOpenCreate}>
            Criar um novo card
          </Button>
        </div>
      ) : view === "list" ? (
        <CardListTable cards={cards} allStatuses={lookups.statuses} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <CardTile key={card.id} card={card} allStatuses={lookups.statuses} />
          ))}
        </div>
      )}
    </>
  );
}
