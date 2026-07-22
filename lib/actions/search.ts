"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  id: string;
  title: string;
  typeKey: string;
  typeLabel: string;
  statusLabel: string;
  statusColor: string;
};

const RESULT_SELECT = `
  id, title,
  card_type:card_types!cards_card_type_id_fkey(key, label),
  status:statuses!cards_status_id_fkey(label, color)
`;

type RawResult = {
  id: string;
  title: string;
  card_type: { key: string; label: string } | null;
  status: { label: string; color: string } | null;
};

function mapRow(row: RawResult): SearchResult {
  return {
    id: row.id,
    title: row.title,
    typeKey: row.card_type?.key ?? "",
    typeLabel: row.card_type?.label ?? "",
    statusLabel: row.status?.label ?? "",
    statusColor: row.status?.color ?? "#888888",
  };
}

export async function searchCards(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = await createClient();
  const results = new Map<string, SearchResult>();

  const [textMatch, typeMatch, tagMatch, modeloMatch, responsavelMatch] = await Promise.all([
    supabase
      .from("cards")
      .select(RESULT_SELECT)
      .textSearch("search_vector", q, { type: "websearch", config: "portuguese" })
      .limit(15),
    supabase.from("card_types").select("id").ilike("label", `%${q}%`),
    supabase.from("tags").select("id").ilike("name", `%${q}%`),
    supabase.from("modelos").select("id").ilike("name", `%${q}%`),
    supabase.from("team_members").select("id").ilike("full_name", `%${q}%`),
  ]);

  for (const row of (textMatch.data ?? []) as unknown as RawResult[]) {
    results.set(row.id, mapRow(row));
  }

  if (typeMatch.data && typeMatch.data.length > 0) {
    const { data } = await supabase
      .from("cards")
      .select(RESULT_SELECT)
      .in(
        "card_type_id",
        typeMatch.data.map((t) => t.id),
      )
      .limit(15);
    for (const row of (data ?? []) as unknown as RawResult[]) results.set(row.id, mapRow(row));
  }

  if (modeloMatch.data && modeloMatch.data.length > 0) {
    const { data: modeloRows } = await supabase
      .from("card_modelos")
      .select("card_id")
      .in(
        "modelo_id",
        modeloMatch.data.map((m) => m.id),
      );
    const cardIds = [...new Set((modeloRows ?? []).map((r) => r.card_id))];
    if (cardIds.length > 0) {
      const { data } = await supabase.from("cards").select(RESULT_SELECT).in("id", cardIds).limit(15);
      for (const row of (data ?? []) as unknown as RawResult[]) results.set(row.id, mapRow(row));
    }
  }

  if (responsavelMatch.data && responsavelMatch.data.length > 0) {
    const { data: responsavelRows } = await supabase
      .from("card_responsaveis")
      .select("card_id")
      .in(
        "team_member_id",
        responsavelMatch.data.map((m) => m.id),
      );
    const cardIds = [...new Set((responsavelRows ?? []).map((r) => r.card_id))];
    if (cardIds.length > 0) {
      const { data } = await supabase.from("cards").select(RESULT_SELECT).in("id", cardIds).limit(15);
      for (const row of (data ?? []) as unknown as RawResult[]) results.set(row.id, mapRow(row));
    }
  }

  if (tagMatch.data && tagMatch.data.length > 0) {
    const { data: tagRows } = await supabase
      .from("card_tags")
      .select("card_id")
      .in(
        "tag_id",
        tagMatch.data.map((t) => t.id),
      );
    const cardIds = [...new Set((tagRows ?? []).map((r) => r.card_id))];
    if (cardIds.length > 0) {
      const { data } = await supabase.from("cards").select(RESULT_SELECT).in("id", cardIds).limit(15);
      for (const row of (data ?? []) as unknown as RawResult[]) results.set(row.id, mapRow(row));
    }
  }

  return Array.from(results.values()).slice(0, 20);
}
