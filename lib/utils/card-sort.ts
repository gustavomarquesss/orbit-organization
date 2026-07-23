import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";

export const CARD_SORT_OPTIONS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "titulo", label: "Título (A-Z)" },
  { value: "responsavel", label: "Responsável (A-Z)" },
  { value: "prioridade", label: "Prioridade (mais urgente primeiro)" },
  { value: "criado", label: "Data de criação" },
] as const;

function firstResponsavelName(card: CardWithRelations): string {
  return card.card_responsaveis[0]?.team_member?.full_name ?? "";
}

export function sortCards(
  cards: CardWithRelations[],
  sortKey: string | undefined,
  priorities: CardLookups["priorities"],
): CardWithRelations[] {
  const sorted = [...cards];

  switch (sortKey) {
    case "titulo":
      sorted.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
      break;
    case "responsavel":
      sorted.sort((a, b) => firstResponsavelName(a).localeCompare(firstResponsavelName(b), "pt-BR"));
      break;
    case "prioridade": {
      const rank = new Map(priorities.map((p, i) => [p.id, i]));
      sorted.sort((a, b) => (rank.get(b.priority?.id ?? "") ?? -1) - (rank.get(a.priority?.id ?? "") ?? -1));
      break;
    }
    case "criado":
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
      break;
    default:
      sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  return sorted;
}
