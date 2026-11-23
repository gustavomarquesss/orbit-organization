"use client";

import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardTabs } from "@/components/cards/card-tabs";
import type { CardExtras, CardViewer } from "@/lib/queries/card-extras";
import type { CardActivityEntry, CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { MeetingDetails } from "@/lib/queries/meetings";
import type { FinanceiroDetails } from "@/lib/queries/financeiro";

export function CardDetailModal({
  card,
  lookups,
  meetingDetails,
  financeiroDetails,
  activity,
  extras,
  viewer,
}: {
  card: CardWithRelations;
  lookups: CardLookups;
  meetingDetails: MeetingDetails | null;
  financeiroDetails: FinanceiroDetails | null;
  activity: CardActivityEntry[];
  extras: CardExtras;
  viewer: CardViewer | null;
}) {
  const router = useRouter();
  const isFinanceiro = card.card_type?.key === "financeiro";
  const financeiroLabel = financeiroDetails?.tipo === "receita" ? "Editar Receita" : "Editar Gasto";

  function close() {
    router.back();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        {card.cover_color ? (
          <div
            className="-mx-4 -mt-4 h-2 rounded-t-xl"
            style={{ background: `linear-gradient(90deg, ${card.cover_color}, ${card.cover_color}88)` }}
          />
        ) : null}
        <DialogHeader>
          <DialogTitle>
            {isFinanceiro ? financeiroLabel : "Editar Card"} #{card.card_number}
          </DialogTitle>
        </DialogHeader>
        <CardTabs
          card={card}
          lookups={lookups}
          meetingDetails={meetingDetails}
          financeiroDetails={financeiroDetails}
          activity={activity}
          extras={extras}
          viewer={viewer}
          onDone={close}
        />
      </DialogContent>
    </Dialog>
  );
}
