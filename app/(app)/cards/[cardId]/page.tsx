import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { CardDetailPageForm } from "@/components/cards/card-detail-page-form";
import { getCardById, getCardLookups } from "@/lib/queries/cards";
import { getMeetingDetails } from "@/lib/queries/meetings";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  const [card, lookups] = await Promise.all([getCardById(cardId), getCardLookups()]);

  if (!card) notFound();

  const meetingDetails = card.card_type?.key === "reuniao" ? await getMeetingDetails(cardId) : null;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={card.title} description="Editar card" />
      <CardDetailPageForm card={card} lookups={lookups} meetingDetails={meetingDetails} />
    </div>
  );
}
