"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardForm } from "@/components/cards/card-form";
import type { CardLookups } from "@/lib/queries/cards";

export function CardFormDialog({
  open,
  onOpenChange,
  lookups,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: CardLookups;
  onSuccess: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Card</DialogTitle>
        </DialogHeader>
        <CardForm lookups={lookups} onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
