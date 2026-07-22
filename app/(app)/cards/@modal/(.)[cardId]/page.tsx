import { notFound } from "next/navigation";

import { CardDetailModal } from "@/components/cards/card-detail-modal";
import { getCardById, getCardLookups } from "@/lib/queries/cards";
import { getMeetingDetails } from "@/lib/queries/meetings";

export default async function InterceptedCardModal({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  const [card, lookups] = await Promise.all([getCardById(cardId), getCardLookups()]);

  if (!card) notFound();

  const meetingDetails = card.card_type?.key === "reuniao" ? await getMeetingDetails(cardId) : null;

  return <CardDetailModal card={card} lookups={lookups} meetingDetails={meetingDetails} />;
}
