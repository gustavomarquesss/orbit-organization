"use client";

import { ListChecks, Link2, MessageSquare } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardForm } from "@/components/cards/card-form";
import { FinanceiroForm } from "@/components/cards/financeiro-form";
import { CardHistoryPanel } from "@/components/cards/card-history-panel";
import { CardChecklists } from "@/components/cards/card-checklists";
import { CardComments } from "@/components/cards/card-comments";
import { CardLinks } from "@/components/cards/card-links";
import { CoverPicker } from "@/components/cards/cover-picker";
import { isItemDone } from "@/lib/utils/checklist";
import type { CardExtras, CardViewer } from "@/lib/queries/card-extras";
import type { CardActivityEntry, CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { MeetingDetails } from "@/lib/queries/meetings";
import type { FinanceiroDetails } from "@/lib/queries/financeiro";

function Count({ value }: { value: string | number }) {
  return <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">{value}</span>;
}

// Abas de um card, no estilo Trello: detalhes, checklist, comentários, anexos e histórico.
// Usado tanto no modal (rota interceptada) quanto na página cheia do card.
export function CardTabs({
  card,
  lookups,
  meetingDetails,
  financeiroDetails,
  activity,
  extras,
  viewer,
  onDone,
}: {
  card: CardWithRelations;
  lookups: CardLookups;
  meetingDetails: MeetingDetails | null;
  financeiroDetails: FinanceiroDetails | null;
  activity: CardActivityEntry[];
  extras: CardExtras;
  viewer: CardViewer | null;
  onDone: () => void;
}) {
  const isFinanceiro = card.card_type?.key === "financeiro";
  const canEdit = viewer?.canEdit ?? false;

  const totalItems = extras.checklists.reduce((sum, list) => sum + list.items.length, 0);
  const doneItems = extras.checklists.reduce(
    (sum, list) => sum + list.items.filter((item) => isItemDone(item, list.repeat_daily, extras.today)).length,
    0,
  );

  return (
    <Tabs defaultValue="detalhes">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="w-max">
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          {isFinanceiro ? null : (
            <>
              <TabsTrigger value="checklist" className="gap-1">
                <ListChecks className="size-3.5" />
                Checklist
                {totalItems > 0 ? <Count value={`${doneItems}/${totalItems}`} /> : null}
              </TabsTrigger>
              <TabsTrigger value="comentarios" className="gap-1">
                <MessageSquare className="size-3.5" />
                Comentários
                {extras.comments.length > 0 ? <Count value={extras.comments.length} /> : null}
              </TabsTrigger>
              <TabsTrigger value="anexos" className="gap-1">
                <Link2 className="size-3.5" />
                Anexos
                {extras.links.length > 0 ? <Count value={extras.links.length} /> : null}
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="detalhes" className="space-y-4">
        {isFinanceiro ? (
          <FinanceiroForm
            lookups={lookups}
            financeiroTypeId={card.card_type!.id}
            card={card}
            financeiroDetails={financeiroDetails}
            onSuccess={onDone}
            onCancel={onDone}
          />
        ) : (
          <>
            {extras.available ? <CoverPicker cardId={card.id} initial={card.cover_color ?? null} canEdit={canEdit} /> : null}
            <CardForm
              key={`${card.id}-${card.updated_at}`}
              lookups={lookups}
              card={card}
              meetingDetails={meetingDetails}
              onSuccess={onDone}
              onCancel={onDone}
            />
          </>
        )}
      </TabsContent>

      {isFinanceiro ? null : (
        <>
          <TabsContent value="checklist">
            <CardChecklists
              cardId={card.id}
              initial={extras.checklists}
              today={extras.today}
              canEdit={canEdit}
              available={extras.available}
            />
          </TabsContent>
          <TabsContent value="comentarios">
            <CardComments
              cardId={card.id}
              initial={extras.comments}
              currentUserId={viewer?.userId ?? ""}
              isAdmin={viewer?.isAdmin ?? false}
              me={viewer?.member ?? null}
              available={extras.available}
            />
          </TabsContent>
          <TabsContent value="anexos">
            <CardLinks cardId={card.id} initial={extras.links} canEdit={canEdit} available={extras.available} />
          </TabsContent>
        </>
      )}

      <TabsContent value="historico">
        <CardHistoryPanel entries={activity} />
      </TabsContent>
    </Tabs>
  );
}
