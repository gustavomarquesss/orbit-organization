import { PageHeader } from "@/components/layout/page-header";
import { CardsExplorer } from "@/components/cards/cards-explorer";
import { getCardLookups, getCardsWithRelations, type CardFilters } from "@/lib/queries/cards";

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const filters: CardFilters = {
    cardTypeId: get("tipo"),
    statusId: get("status"),
    priorityId: get("prioridade"),
    responsavelId: get("responsavel"),
    modeloId: get("modelo"),
    tagIds: get("tag") ? [get("tag") as string] : undefined,
    from: get("de"),
    to: get("ate"),
  };
  const view = get("view") === "list" ? "list" : "grid";

  const [cards, lookups] = await Promise.all([getCardsWithRelations(filters), getCardLookups()]);

  return (
    <>
      <PageHeader title="Cards" description="Todo o conteúdo da equipe em um único lugar." />
      <CardsExplorer cards={cards} lookups={lookups} view={view} />
    </>
  );
}
