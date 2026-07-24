"use client";

import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardForm } from "@/components/cards/card-form";
import { FinanceiroForm } from "@/components/cards/financeiro-form";
import { CardHistoryPanel } from "@/components/cards/card-history-panel";
import type { CardActivityEntry, CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { MeetingDetails } from "@/lib/queries/meetings";
import type { FinanceiroDetails } from "@/lib/queries/financeiro";

export function CardDetailPageForm({
  card,
  lookups,
  meetingDetails,
  financeiroDetails,
  activity,
}: {
  card: CardWithRelations;
  lookups: CardLookups;
  meetingDetails: MeetingDetails | null;
  financeiroDetails: FinanceiroDetails | null;
  activity: CardActivityEntry[];
}) {
  const router = useRouter();

  function backToCards() {
    router.push(card.card_type?.key === "financeiro" ? "/financeiro" : "/cards");
  }

  const form =
    card.card_type?.key === "financeiro" ? (
      <FinanceiroForm
        lookups={lookups}
        financeiroTypeId={card.card_type.id}
        card={card}
        financeiroDetails={financeiroDetails}
        onSuccess={backToCards}
        onCancel={backToCards}
      />
    ) : (
      <CardForm
        key={`${card.id}-${card.updated_at}`}
        lookups={lookups}
        card={card}
        meetingDetails={meetingDetails}
        onSuccess={backToCards}
        onCancel={backToCards}
      />
    );

  return (
    <Tabs defaultValue="detalhes">
      <TabsList>
        <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
        <TabsTrigger value="historico">Histórico</TabsTrigger>
      </TabsList>
      <TabsContent value="detalhes">{form}</TabsContent>
      <TabsContent value="historico">
        <CardHistoryPanel entries={activity} />
      </TabsContent>
    </Tabs>
  );
}
