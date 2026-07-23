import * as XLSX from "xlsx";

import { getCardLookups, getCardsWithRelations } from "@/lib/queries/cards";
import {
  getDashboardStats,
  getOpenCountByModelo,
  getOpenCountByResponsavel,
  getRecentCompletionsCount,
} from "@/lib/queries/dashboard";

export async function GET() {
  const lookups = await getCardLookups();
  const financeiroId = lookups.cardTypes.find((t) => t.key === "financeiro")?.id;

  const [cards, stats, byModelo, byResponsavel, recentCompletions] = await Promise.all([
    getCardsWithRelations({ excludeCardTypeId: financeiroId }),
    getDashboardStats(),
    getOpenCountByModelo(9999),
    getOpenCountByResponsavel(9999),
    getRecentCompletionsCount(7),
  ]);

  const metricsSheet = XLSX.utils.json_to_sheet([
    { Métrica: "Total de cards", Valor: stats.total },
    { Métrica: "Pendentes", Valor: stats.pendentes },
    { Métrica: "Concluídos", Valor: stats.concluidos },
    { Métrica: "Urgentes", Valor: stats.urgentes },
    { Métrica: "Concluídos (últimos 7 dias)", Valor: recentCompletions },
  ]);

  const cardsSheet = XLSX.utils.json_to_sheet(
    cards.map((card) => ({
      Título: card.title,
      Tipo: card.card_type?.label ?? "",
      Status: card.status?.label ?? "",
      Prioridade: card.priority?.label ?? "",
      Modelos: card.card_modelos.map((m) => m.modelo?.name).filter(Boolean).join(", "),
      Responsáveis: card.card_responsaveis.map((r) => r.team_member?.full_name).filter(Boolean).join(", "),
      Tags: card.card_tags.map((t) => t.tag?.name).filter(Boolean).join(", "),
      "Criado em": new Date(card.created_at).toLocaleString("pt-BR"),
      "Atualizado em": new Date(card.updated_at).toLocaleString("pt-BR"),
      Descrição: card.description ?? "",
      Observações: card.observacoes ?? "",
    })),
  );

  const modeloSheet = XLSX.utils.json_to_sheet(
    byModelo.map((item) => ({ Modelo: item.label, "Cards em aberto": item.count })),
  );

  const responsavelSheet = XLSX.utils.json_to_sheet(
    byResponsavel.map((item) => ({ Responsável: item.label, "Cards em aberto": item.count })),
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, metricsSheet, "Métricas");
  XLSX.utils.book_append_sheet(workbook, cardsSheet, "Cards");
  XLSX.utils.book_append_sheet(workbook, modeloSheet, "Por Modelo");
  XLSX.utils.book_append_sheet(workbook, responsavelSheet, "Por Responsável");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dashboard-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
