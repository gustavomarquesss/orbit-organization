import { createClient } from "@/lib/supabase/server";
import type { BreakdownItem } from "@/lib/queries/dashboard";

const OPERATION_CARD_TYPE_KEYS = ["video", "foto", "funil", "referencia", "conteudo"];

function toBRTDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

function toBRTMonthKey(iso: string): string {
  return toBRTDateKey(iso).slice(0, 7);
}

export type PendingTask = {
  id: string;
  title: string;
  card_type: { key: string; label: string; emoji: string } | null;
  prazo_data: string | null;
  prazo_hora: string | null;
  status: { id: string; key: string; label: string; color: string } | null;
};

export async function getMyPendingTasks(teamMemberId: string, limit = 8): Promise<PendingTask[]> {
  const supabase = await createClient();

  const [{ data: myCardIdRows }, { data: excludedStatuses }] = await Promise.all([
    supabase.from("card_responsaveis").select("card_id").eq("team_member_id", teamMemberId),
    supabase.from("statuses").select("id").in("key", ["concluido", "arquivado"]),
  ]);

  const cardIds = (myCardIdRows ?? []).map((r) => r.card_id);
  if (cardIds.length === 0) return [];

  const excludedIds = (excludedStatuses ?? []).map((s) => s.id);

  let query = supabase
    .from("cards")
    .select(
      "id, title, prazo_data, prazo_hora, card_type:card_types!cards_card_type_id_fkey(key, label, emoji), status:statuses!cards_status_id_fkey(id, key, label, color)",
    )
    .in("id", cardIds)
    .order("prazo_data", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (excludedIds.length > 0) query = query.not("status_id", "in", `(${excludedIds.join(",")})`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as PendingTask[];
}

export type MyStats = {
  totalConcluidas: number;
  byType: BreakdownItem[];
  recordMonth: { label: string; count: number } | null;
  streak: number;
};

export async function getMyStats(teamMemberId: string): Promise<MyStats> {
  const supabase = await createClient();

  const [{ data: status }, { data: cardTypes }, { data: myCardIdRows }] = await Promise.all([
    supabase.from("statuses").select("id").eq("key", "concluido").maybeSingle(),
    supabase.from("card_types").select("id, key, label").in("key", OPERATION_CARD_TYPE_KEYS),
    supabase.from("card_responsaveis").select("card_id").eq("team_member_id", teamMemberId),
  ]);

  const empty: MyStats = { totalConcluidas: 0, byType: [], recordMonth: null, streak: 0 };

  const myCardIds = (myCardIdRows ?? []).map((r) => r.card_id);
  const typeIds = (cardTypes ?? []).map((t) => t.id);
  if (!status || myCardIds.length === 0 || typeIds.length === 0) return empty;

  const { data: cards, error } = await supabase
    .from("cards")
    .select("concluded_at, card_type_id")
    .in("id", myCardIds)
    .in("card_type_id", typeIds)
    .eq("status_id", status.id);
  if (error) throw error;

  const rows = (cards ?? []).filter((c) => c.concluded_at) as { concluded_at: string; card_type_id: string }[];
  if (rows.length === 0) return empty;

  const typeById = new Map((cardTypes ?? []).map((t) => [t.id, t.label]));
  const byTypeCounts = new Map<string, BreakdownItem>();
  for (const row of rows) {
    const label = typeById.get(row.card_type_id) ?? "—";
    const existing = byTypeCounts.get(row.card_type_id);
    if (existing) existing.count += 1;
    else byTypeCounts.set(row.card_type_id, { id: row.card_type_id, label, count: 1 });
  }
  const byType = Array.from(byTypeCounts.values()).sort((a, b) => b.count - a.count);

  const monthCounts = new Map<string, number>();
  for (const row of rows) {
    const key = toBRTMonthKey(row.concluded_at);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  let recordMonth: MyStats["recordMonth"] = null;
  for (const [key, count] of monthCounts) {
    if (!recordMonth || count > recordMonth.count) {
      const [year, month] = key.split("-").map(Number);
      const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
      recordMonth = { label: label.charAt(0).toUpperCase() + label.slice(1), count };
    }
  }

  const activeDays = new Set(rows.map((row) => toBRTDateKey(row.concluded_at)));
  let streak = 0;
  const cursor = new Date();
  let cursorKey = toBRTDateKey(cursor.toISOString());
  if (!activeDays.has(cursorKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    cursorKey = toBRTDateKey(cursor.toISOString());
  }
  while (activeDays.has(cursorKey)) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    cursorKey = toBRTDateKey(cursor.toISOString());
  }

  return { totalConcluidas: rows.length, byType, recordMonth, streak };
}
