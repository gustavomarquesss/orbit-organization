"use client";

import { useRouter } from "next/navigation";

import { CardForm } from "@/components/cards/card-form";
import { FinanceiroForm } from "@/components/cards/financeiro-form";
import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { MeetingDetails } from "@/lib/queries/meetings";
import type { FinanceiroDetails } from "@/lib/queries/financeiro";

export function CardDetailPageForm({
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

  function backToCards() {
    router.push(card.card_type?.key === "financeiro" ? "/financeiro" : "/cards");
  }

  if (card.card_type?.key === "financeiro") {
    return (
      <FinanceiroForm
        lookups={lookups}
        financeiroTypeId={card.card_type.id}
        card={card}
        financeiroDetails={financeiroDetails}
        onSuccess={backToCards}
        onCancel={backToCards}
      />
    );
  }

  return (
    <CardForm
      lookups={lookups}
      card={card}
      meetingDetails={meetingDetails}
      onSuccess={backToCards}
      onCancel={backToCards}
    />
  );
}
