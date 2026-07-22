import { createClient } from "@/lib/supabase/server";

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
