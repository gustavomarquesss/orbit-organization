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
  newCardSlot,
}: {
  cards: CardWithRelations[];
  lookups: CardLookups;
  view: "grid" | "list";
  newCardSlot?: React.ReactNode;
}) {
  const openCreate = useQuickAddCard();

  return (
    <>
      <FilterBar lookups={lookups} />

      <div className="mb-4 flex items-center justify-between gap-2">
        <ViewToggle />
        {newCardSlot ?? (
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" />
            Novo Card
          </Button>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          <p>Nenhum card encontrado.</p>
          {newCardSlot ? null : (
            <Button variant="link" onClick={openCreate}>
              Criar um novo card
            </Button>
          )}
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
