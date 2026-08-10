import { PageHeader } from "@/components/layout/page-header";
import { CardsExplorer } from "@/components/cards/cards-explorer";
import { NovoGastoButton } from "@/components/cards/novo-gasto-button";
import { FinanceiroSummary } from "@/components/financeiro/financeiro-summary";
import { getCardLookups, getCardsWithRelations, type CardFilters } from "@/lib/queries/cards";
import { getFinanceiroMetas, getFinanceiroSummary } from "@/lib/queries/financeiro";

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
    criadoPorId: get("criadoPor"),
    modeloId: get("modelo"),
    tagIds: get("tag") ? [get("tag") as string] : undefined,
    from: get("de"),
    to: get("ate"),
    pendente: get("pendente") === "1",
    hideConcluido: get("concluidos") !== "1",
  };
  const view = get("view") === "list" ? "list" : "grid";

  const [cards, summary, metas] = await Promise.all([
    financeiroId ? getCardsWithRelations(filters) : Promise.resolve([]),
    getFinanceiroSummary(),
    getFinanceiroMetas(),
  ]);

  return (
    <>
      <PageHeader title="Financeiro" description="Gastos e receitas organizados fora das métricas do Dashboard." />
      <div className="mb-4">
        <FinanceiroSummary summary={summary} metas={metas} />
      </div>
      <CardsExplorer
        cards={cards}
        lookups={scopedLookups}
        view={view}
        newCardSlot={financeiroId ? <NovoGastoButton lookups={lookups} financeiroTypeId={financeiroId} /> : null}
      />
    </>
  );
}
