import { notFound } from "next/navigation";

import { CardDetailModal } from "@/components/cards/card-detail-modal";
import { getCardActivity, getCardById, getCardLookups } from "@/lib/queries/cards";
import { getMeetingDetails } from "@/lib/queries/meetings";
import { getFinanceiroDetails } from "@/lib/queries/financeiro";

export default async function InterceptedCardModal({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  const [card, lookups, activity] = await Promise.all([getCardById(cardId), getCardLookups(), getCardActivity(cardId)]);

  if (!card) notFound();

  const meetingDetails = card.card_type?.key === "reuniao" ? await getMeetingDetails(cardId) : null;
  const financeiroDetails = card.card_type?.key === "financeiro" ? await getFinanceiroDetails(cardId) : null;

  return (
    <CardDetailModal
      card={card}
      lookups={lookups}
      meetingDetails={meetingDetails}
      financeiroDetails={financeiroDetails}
      activity={activity}
    />
  );
}
