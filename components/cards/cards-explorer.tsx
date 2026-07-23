"use client";

import { useState } from "react";
import { Copy, Plus, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CardTile } from "@/components/cards/card-tile";
import { CardListTable } from "@/components/cards/card-list-table";
import { FilterBar } from "@/components/cards/filter-bar";
import { ViewToggle } from "@/components/cards/view-toggle";
import { useQuickAddCard } from "@/components/cards/card-quick-add-provider";
import { bulkDeleteCards, bulkDuplicateCards } from "@/lib/actions/cards";
import { CARD_SORT_OPTIONS, sortCards } from "@/lib/utils/card-sort";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const sortKey = searchParams.get("ordenar") ?? "recentes";
  function setSortKey(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "recentes") params.delete("ordenar");
    else params.set("ordenar", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const sortedCards = sortCards(cards, sortKey, lookups.priorities);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      }
      return new Set([...prev, ...ids]);
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkDuplicate() {
    setIsBulkWorking(true);
    setBulkError(null);
    const result = await bulkDuplicateCards([...selectedIds]);
    setIsBulkWorking(false);
    if (result.error) {
      setBulkError(result.error);
      return;
    }
    clearSelection();
    router.refresh();
  }

  async function handleBulkDelete() {
    setIsBulkWorking(true);
    setBulkError(null);
    const result = await bulkDeleteCards([...selectedIds]);
    setIsBulkWorking(false);
    if (result.error) {
      setBulkError(result.error);
      return;
    }
    clearSelection();
    router.refresh();
  }

  return (
    <>
      <FilterBar lookups={lookups} />

      {selectedIds.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkDuplicate} disabled={isBulkWorking} className="gap-1.5">
              <Copy className="size-3.5" />
              Duplicar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="destructive" size="sm" disabled={isBulkWorking} className="gap-1.5" />}
              >
                <Trash2 className="size-3.5" />
                Excluir
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir {selectedIds.size} card(s)?</AlertDialogTitle>
                  <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="sm" onClick={clearSelection} className="gap-1.5">
              <X className="size-3.5" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ViewToggle />
            <Select value={sortKey} onValueChange={setSortKey}>
              <SelectTrigger size="sm" className="w-fit">
                <span className="text-xs text-muted-foreground">Ordenar:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {newCardSlot ?? (
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="size-4" />
              Novo Card
            </Button>
          )}
        </div>
      )}

      {bulkError ? <p className="mb-3 text-sm text-destructive">{bulkError}</p> : null}

      {sortedCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          <p>Nenhum card encontrado.</p>
          {newCardSlot ? null : (
            <Button variant="link" onClick={openCreate}>
              Criar um novo card
            </Button>
          )}
        </div>
      ) : view === "list" ? (
        <CardListTable
          cards={sortedCards}
          allStatuses={lookups.statuses}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedCards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              allStatuses={lookups.statuses}
              selected={selectedIds.has(card.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}
    </>
  );
}
