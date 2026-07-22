"use client";

import { useRouter } from "next/navigation";

import { CardForm } from "@/components/cards/card-form";
import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { MeetingDetails } from "@/lib/queries/meetings";

export function CardDetailPageForm({
  card,
  lookups,
  meetingDetails,
}: {
  card: CardWithRelations;
  lookups: CardLookups;
  meetingDetails: MeetingDetails | null;
}) {
  const router = useRouter();

  function backToCards() {
    router.push("/cards");
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
