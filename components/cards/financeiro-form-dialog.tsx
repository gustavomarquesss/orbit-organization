"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FinanceiroForm } from "@/components/cards/financeiro-form";
import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { FinanceiroDetails } from "@/lib/queries/financeiro";

export function FinanceiroFormDialog({
  open,
  onOpenChange,
  lookups,
  financeiroTypeId,
  card,
  financeiroDetails,
  defaultTipo,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: CardLookups;
  financeiroTypeId: string;
  card?: CardWithRelations | null;
  financeiroDetails?: FinanceiroDetails | null;
  defaultTipo?: "gasto" | "receita";
  onSuccess: () => void;
}) {
  const tipo = financeiroDetails?.tipo ?? defaultTipo ?? "gasto";
  const title = card
    ? tipo === "receita"
      ? "Editar Receita"
      : "Editar Gasto"
    : tipo === "receita"
      ? "Nova Receita"
      : "Novo Gasto";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <FinanceiroForm
          lookups={lookups}
          financeiroTypeId={financeiroTypeId}
          card={card}
          financeiroDetails={financeiroDetails}
          defaultTipo={defaultTipo}
          onSuccess={onSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
