import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { CardDetailPageForm } from "@/components/cards/card-detail-page-form";
import { getCardActivity, getCardById, getCardLookups } from "@/lib/queries/cards";
import { getMeetingDetails } from "@/lib/queries/meetings";
import { getFinanceiroDetails } from "@/lib/queries/financeiro";

export default async function CardDetailPage({
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
    <div className="mx-auto max-w-lg">
      <PageHeader
        title={`#${card.card_number} · ${card.title}`}
        description={
          card.card_type?.key === "financeiro"
            ? financeiroDetails?.tipo === "receita"
              ? "Editar receita"
              : "Editar gasto"
            : "Editar card"
        }
      />
      <CardDetailPageForm
        card={card}
        lookups={lookups}
        meetingDetails={meetingDetails}
        financeiroDetails={financeiroDetails}
        activity={activity}
      />
    </div>
  );
}
