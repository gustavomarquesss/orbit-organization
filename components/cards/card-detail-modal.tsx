"use client";

import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardForm } from "@/components/cards/card-form";
import { FinanceiroForm } from "@/components/cards/financeiro-form";
import { CardHistoryPanel } from "@/components/cards/card-history-panel";
import type { CardActivityEntry, CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { MeetingDetails } from "@/lib/queries/meetings";
import type { FinanceiroDetails } from "@/lib/queries/financeiro";

export function CardDetailModal({
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
  const isFinanceiro = card.card_type?.key === "financeiro";
  const financeiroLabel = financeiroDetails?.tipo === "receita" ? "Editar Receita" : "Editar Gasto";

  function close() {
    router.back();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isFinanceiro ? financeiroLabel : "Editar Card"} #{card.card_number}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="detalhes">
          <TabsList>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="detalhes">
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
              <CardForm
                key={`${card.id}-${card.updated_at}`}
                lookups={lookups}
                card={card}
                meetingDetails={meetingDetails}
                onSuccess={close}
                onCancel={close}
              />
            )}
          </TabsContent>
          <TabsContent value="historico">
            <CardHistoryPanel entries={activity} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
