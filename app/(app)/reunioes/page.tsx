import { PageHeader } from "@/components/layout/page-header";
import { CardsExplorer } from "@/components/cards/cards-explorer";
import { getCardLookups, getCardsWithRelations, type CardFilters } from "@/lib/queries/cards";

export default async function ReunioesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const lookups = await getCardLookups();
  const reuniaoType = lookups.cardTypes.find((t) => t.key === "reuniao");

  const filters: CardFilters = {
    cardTypeId: get("tipo") ?? reuniaoType?.id,
    statusId: get("status"),
    priorityId: get("prioridade"),
    responsavelId: get("responsavel"),
    modeloId: get("modelo"),
    tagIds: get("tag") ? [get("tag") as string] : undefined,
    from: get("de"),
    to: get("ate"),
    hideConcluido: get("concluidos") !== "1",
  };
  const view = get("view") === "list" ? "list" : "grid";

  const cards = filters.cardTypeId ? await getCardsWithRelations(filters) : [];

  return (
    <>
      <PageHeader title="Reuniões" description="Registro de reuniões da equipe." />
      <CardsExplorer cards={cards} lookups={lookups} view={view} />
    </>
  );
}
