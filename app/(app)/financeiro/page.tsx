import { PageHeader } from "@/components/layout/page-header";
import { CardsExplorer } from "@/components/cards/cards-explorer";
import { NovoGastoButton } from "@/components/cards/novo-gasto-button";
import { getCardLookups, getCardsWithRelations, type CardFilters } from "@/lib/queries/cards";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const lookups = await getCardLookups();
  const financeiroId = lookups.cardTypes.find((t) => t.key === "financeiro")?.id;
  // A aba Financeiro só mostra cards do tipo Financeiro, então o filtro de
  // Tipo não faz sentido aqui — restringe as opções ao próprio Financeiro.
  const scopedLookups = { ...lookups, cardTypes: lookups.cardTypes.filter((t) => t.key === "financeiro") };

  const filters: CardFilters = {
    cardTypeId: financeiroId,
    statusId: get("status"),
    priorityId: get("prioridade"),
    responsavelId: get("responsavel"),
    modeloId: get("modelo"),
    tagIds: get("tag") ? [get("tag") as string] : undefined,
    from: get("de"),
    to: get("ate"),
    pendente: get("pendente") === "1",
    hideConcluido: get("concluidos") !== "1",
  };
  const view = get("view") === "list" ? "list" : "grid";

  const cards = financeiroId ? await getCardsWithRelations(filters) : [];

  return (
    <>
      <PageHeader title="Financeiro" description="Gastos organizados fora das métricas do Dashboard." />
      <CardsExplorer
        cards={cards}
        lookups={scopedLookups}
        view={view}
        newCardSlot={financeiroId ? <NovoGastoButton lookups={lookups} financeiroTypeId={financeiroId} /> : null}
      />
    </>
  );
}
