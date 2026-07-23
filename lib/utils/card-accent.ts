import type { CardWithRelations } from "@/lib/queries/cards";

// Só cards Concluídos (verde do próprio status) ou de prioridade Urgente
// (cor da prioridade) ganham destaque de cor na borda. Baixa/Média/Alta ficam
// neutras, sem cor.
export function getCardAccentColor(card: CardWithRelations): string | undefined {
  if (card.status?.key === "concluido") return card.status.color;
  if (card.priority?.key === "urgente") return card.priority.color;
  return undefined;
}
