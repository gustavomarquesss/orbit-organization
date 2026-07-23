"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useQuickAddCard } from "@/components/cards/card-quick-add-provider";

export function QuickAddCardButton({
  label = "Novo Card",
  lockedCardTypeId,
  dialogTitle,
}: {
  label?: string;
  lockedCardTypeId?: string;
  dialogTitle?: string;
}) {
  const openCreate = useQuickAddCard();

  return (
    <Button size="sm" onClick={() => openCreate({ lockedCardTypeId, title: dialogTitle })} className="gap-1.5">
      <Plus className="size-4" />
      {label}
    </Button>
  );
}
