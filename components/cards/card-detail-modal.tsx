"use client";

import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardForm } from "@/components/cards/card-form";
import { FinanceiroForm } from "@/components/cards/financeiro-form";
import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { MeetingDetails } from "@/lib/queries/meetings";
import type { FinanceiroDetails } from "@/lib/queries/financeiro";

export function CardDetailModal({
  card,
  lookups,
  meetingDetails,
  financeiroDetails,
}: {
  card: CardWithRelations;
  lookups: CardLookups;
  meetingDetails: MeetingDetails | null;
  financeiroDetails: FinanceiroDetails | null;
}) {
  const router = useRouter();
  const isFinanceiro = card.card_type?.key === "financeiro";

  function close() {
    router.back();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isFinanceiro ? "Editar Gasto" : "Editar Card"}</DialogTitle>
        </DialogHeader>
        {isFinanceiro ? (
          <FinanceiroForm
            lookups={lookups}
            financeiroTypeId={card.card_type!.id}
            card={card}
            financeiroDetails={financeiroDetails}
            onSuccess={close}
            onCancel={close}
          />
        ) : (
          <CardForm lookups={lookups} card={card} meetingDetails={meetingDetails} onSuccess={close} onCancel={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}
