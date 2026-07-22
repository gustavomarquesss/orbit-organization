import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getExcludedStatusIds(supabase: SupabaseServerClient): Promise<string[]> {
  const { data } = await supabase.from("statuses").select("id, key").in("key", ["concluido", "arquivado"]);
  return (data ?? []).map((s) => s.id);
}

export type DashboardStats = {
  total: number;
  pendentes: number;
  concluidos: number;
  urgentes: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [{ data: statuses }, { data: priorities }] = await Promise.all([
    supabase.from("statuses").select("id, key"),
    supabase.from("priorities").select("id, key"),
  ]);

  const concluidoId = statuses?.find((s) => s.key === "concluido")?.id;
  const arquivadoId = statuses?.find((s) => s.key === "arquivado")?.id;
  const urgenteId = priorities?.find((p) => p.key === "urgente")?.id;

  const [{ count: total }, { count: concluidos }, { count: urgentes }] = await Promise.all([
    supabase.from("cards").select("*", { count: "exact", head: true }),
    concluidoId
      ? supabase.from("cards").select("*", { count: "exact", head: true }).eq("status_id", concluidoId)
      : Promise.resolve({ count: 0 }),
    urgenteId
      ? supabase.from("cards").select("*", { count: "exact", head: true }).eq("priority_id", urgenteId)
      : Promise.resolve({ count: 0 }),
  ]);

  const excludeIds = [concluidoId, arquivadoId].filter((id): id is string => Boolean(id));
  let pendentesQuery = supabase.from("cards").select("*", { count: "exact", head: true });
  if (excludeIds.length > 0) {
    pendentesQuery = pendentesQuery.not("status_id", "in", `(${excludeIds.join(",")})`);
  }
  const { count: pendentes } = await pendentesQuery;

  return {
    total: total ?? 0,
    pendentes: pendentes ?? 0,
    concluidos: concluidos ?? 0,
    urgentes: urgentes ?? 0,
  };
}

export type RecentCard = {
  id: string;
  title: string;
  timestamp: string;
  card_type: { emoji: string } | null;
};

export async function getRecentCards(limit = 5): Promise<RecentCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("id, title, created_at, card_type:card_types!cards_card_type_id_fkey(emoji)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    timestamp: row.created_at,
    card_type: row.card_type as unknown as { emoji: string } | null,
  }));
}

export async function getRecentlyUpdatedCards(limit = 5): Promise<RecentCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("id, title, updated_at, card_type:card_types!cards_card_type_id_fkey(emoji)")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    timestamp: row.updated_at,
    card_type: row.card_type as unknown as { emoji: string } | null,
  }));
}

export type UpcomingMeeting = {
  cardId: string;
  title: string;
  meetingDate: string;
  meetingTime: string | null;
};

export async function getUpcomingMeetings(limit = 5): Promise<UpcomingMeeting[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("meeting_details")
    .select("card_id, meeting_date, meeting_time, card:cards!meeting_details_card_id_fkey(title)")
    .gte("meeting_date", today)
    .order("meeting_date", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    cardId: row.card_id,
    title: (row.card as unknown as { title: string } | null)?.title ?? "",
    meetingDate: row.meeting_date,
    meetingTime: row.meeting_time,
  }));
}

export type BreakdownItem = { id: string; label: string; count: number };

function aggregateCounts<T>(rows: T[], keyOf: (row: T) => string, labelOf: (row: T) => string): BreakdownItem[] {
  const counts = new Map<string, BreakdownItem>();
  for (const row of rows) {
    const id = keyOf(row);
    const existing = counts.get(id);
    if (existing) existing.count += 1;
    else counts.set(id, { id, label: labelOf(row), count: 1 });
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

export async function getOpenCountByModelo(limit = 5): Promise<BreakdownItem[]> {
  const supabase = await createClient();
  const excludedIds = await getExcludedStatusIds(supabase);

  let openCardsQuery = supabase.from("cards").select("id");
  if (excludedIds.length > 0) openCardsQuery = openCardsQuery.not("status_id", "in", `(${excludedIds.join(",")})`);
  const { data: openCards } = await openCardsQuery;
  const openIds = (openCards ?? []).map((c) => c.id);
  if (openIds.length === 0) return [];

  const { data, error } = await supabase
    .from("card_modelos")
    .select("modelo_id, modelo:modelos(name)")
    .in("card_id", openIds);
  if (error) throw error;

  type Row = { modelo_id: string; modelo: { name: string } | null };
  return aggregateCounts(
    (data ?? []) as unknown as Row[],
    (row) => row.modelo_id,
    (row) => row.modelo?.name ?? "—",
  ).slice(0, limit);
}

export async function getOpenCountByResponsavel(limit = 5): Promise<BreakdownItem[]> {
  const supabase = await createClient();
  const excludedIds = await getExcludedStatusIds(supabase);

  let openCardsQuery = supabase.from("cards").select("id");
  if (excludedIds.length > 0) openCardsQuery = openCardsQuery.not("status_id", "in", `(${excludedIds.join(",")})`);
  const { data: openCards } = await openCardsQuery;
  const openIds = (openCards ?? []).map((c) => c.id);
  if (openIds.length === 0) return [];

  const { data, error } = await supabase
    .from("card_responsaveis")
    .select("team_member_id, team_member:team_members(full_name)")
    .in("card_id", openIds);
  if (error) throw error;

  type Row = { team_member_id: string; team_member: { full_name: string } | null };
  return aggregateCounts(
    (data ?? []) as unknown as Row[],
    (row) => row.team_member_id,
    (row) => row.team_member?.full_name ?? "—",
  ).slice(0, limit);
}

export type StaleCard = { id: string; title: string; updatedAt: string };

export async function getStaleCards(limit = 5): Promise<StaleCard[]> {
  const supabase = await createClient();
  const excludedIds = await getExcludedStatusIds(supabase);

  let query = supabase.from("cards").select("id, title, updated_at").order("updated_at", { ascending: true }).limit(limit);
  if (excludedIds.length > 0) query = query.not("status_id", "in", `(${excludedIds.join(",")})`);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({ id: row.id, title: row.title, updatedAt: row.updated_at }));
}

export async function getRecentCompletionsCount(days = 7): Promise<number> {
  const supabase = await createClient();
  const { data: status } = await supabase.from("statuses").select("id").eq("key", "concluido").maybeSingle();
  if (!status) return 0;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("status_id", status.id)
    .gte("updated_at", since);

  return count ?? 0;
}
