"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useQuickAddCard } from "@/components/cards/card-quick-add-provider";

export function QuickAddCardButton() {
  const openCreate = useQuickAddCard();

  return (
    <Button size="sm" onClick={openCreate} className="gap-1.5">
      <Plus className="size-4" />
      Novo Card
    </Button>
  );
}
