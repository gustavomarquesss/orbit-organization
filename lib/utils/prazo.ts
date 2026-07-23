import type { CardWithRelations } from "@/lib/queries/cards";

export function formatPrazo(card: Pick<CardWithRelations, "prazo_data" | "prazo_hora">): string | null {
  if (!card.prazo_data) return null;
  const [year, month, day] = card.prazo_data.split("-");
  const date = `${day}/${month}/${year}`;
  return card.prazo_hora ? `${date} ${card.prazo_hora.slice(0, 5)}` : date;
}

export function isPrazoVencido(card: Pick<CardWithRelations, "prazo_data" | "prazo_hora" | "status">): boolean {
  if (!card.prazo_data || card.status?.key === "concluido") return false;
  const deadline = new Date(`${card.prazo_data}T${card.prazo_hora ?? "23:59"}`);
  return deadline.getTime() < Date.now();
}
