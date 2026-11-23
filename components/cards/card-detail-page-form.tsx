"use client";

import { useRouter } from "next/navigation";

import { CardTabs } from "@/components/cards/card-tabs";
import type { CardExtras, CardViewer } from "@/lib/queries/card-extras";
import type { CardActivityEntry, CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { MeetingDetails } from "@/lib/queries/meetings";
import type { FinanceiroDetails } from "@/lib/queries/financeiro";

export function CardDetailPageForm({
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

  function backToCards() {
    router.push(card.card_type?.key === "financeiro" ? "/financeiro" : "/cards");
  }

  return (
    <CardTabs
      card={card}
      lookups={lookups}
      meetingDetails={meetingDetails}
      financeiroDetails={financeiroDetails}
      activity={activity}
      extras={extras}
      viewer={viewer}
      onDone={backToCards}
    />
  );
}
