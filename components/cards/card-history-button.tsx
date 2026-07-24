"use client";

import { useState } from "react";
import { History } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CardHistoryPanel } from "@/components/cards/card-history-panel";
import { fetchCardActivity } from "@/lib/actions/cards";
import type { CardActivityEntry } from "@/lib/queries/cards";

export function CardHistoryButton({ cardId }: { cardId: string }) {
  const [entries, setEntries] = useState<CardActivityEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpenChange(open: boolean) {
    if (!open || entries !== null) return;
    setLoading(true);
    const data = await fetchCardActivity(cardId);
    setEntries(data);
    setLoading(false);
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger
        nativeButton={false}
        render={
          <span
            role="button"
            tabIndex={0}
            title="Histórico"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") e.stopPropagation();
            }}
          >
            <History className="size-3.5" />
          </span>
        }
      />
      <PopoverContent
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <p className="mb-1 text-xs font-medium">Histórico</p>
        <CardHistoryPanel entries={entries ?? []} loading={loading} />
      </PopoverContent>
    </Popover>
  );
}
