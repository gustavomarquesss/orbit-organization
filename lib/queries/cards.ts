import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

const CARD_SELECT = `
  id, card_number, title, description, observacoes, created_at, updated_at, recorrencia, prazo_data, prazo_hora,
  card_type:card_types!cards_card_type_id_fkey(id, key, label, emoji),
  status:statuses!cards_status_id_fkey(id, key, label, color),
  priority:priorities!cards_priority_id_fkey(id, key, label, color),
  card_tags(tag:tags(id, name)),
  card_responsaveis(done_at, team_member:team_members(id, full_name, avatar_color)),
  card_modelos(modelo:modelos(id, name)),
  created_by_member:team_members!cards_created_by_fkey(id, full_name),
  updated_by_member:team_members!cards_updated_by_fkey(id, full_name),
  financeiro_details(
    tipo, valor, data_inicio, recorrencia,
    gasto_por:team_members!financeiro_details_gasto_por_id_fkey(id, full_name)
  )
`;

export type CardWithRelations = {
  id: string;
  card_number: number;
  title: string;
  description: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  recorrencia: string | null;
  prazo_data: string | null;
  prazo_hora: string | null;
  card_type: { id: string; key: string; label: string; emoji: string } | null;
  status: { id: string; key: string; label: string; color: string } | null;
  priority: { id: string; key: string; label: string; color: string } | null;
  card_tags: { tag: { id: string; name: string } | null }[];
  card_responsaveis: {
    done_at: string | null;
    team_member: { id: string; full_name: string; avatar_color: string } | null;
  }[];
  card_modelos: { modelo: { id: string; name: string } | null }[];
  created_by_member: { id: string; full_name: string } | null;
  updated_by_member: { id: string; full_name: string } | null;
  financeiro_details: {
    tipo: "gasto" | "receita";
    valor: number;
    data_inicio: string;
    recorrencia: string;
    gasto_por: { id: string; full_name: string } | null;
  } | null;
};

export async function getCardById(id: string): Promise<CardWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cards").select(CARD_SELECT).eq("id", id).maybeSingle();

  if (error) throw error;
  return (data as unknown as CardWithRelations) ?? null;
}

export type CardActivityEntry = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
  actor: { id: string; full_name: string } | null;
};

export async function getCardActivity(cardId: string): Promise<CardActivityEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_activity")
    .select("id, event_type, payload, created_at, actor:team_members!card_activity_actor_id_fkey(id, full_name)")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as CardActivityEntry[]) ?? [];
}

export type CardFilters = {
  cardTypeId?: string;
  excludeCardTypeId?: string;
  statusId?: string;
  priorityId?: string;
  responsavelId?: string;
  modeloId?: string;
  tagIds?: string[];
  from?: string;
  to?: string;
  pendente?: boolean;
  hideConcluido?: boolean;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function cardIdsFromJoinTable(
  supabase: SupabaseServerClient,
  table: "card_tags" | "card_responsaveis" | "card_modelos",
  column: "tag_id" | "team_member_id" | "modelo_id",
  ids: string[],
): Promise<string[]> {
  const { data, error } = await supabase.from(table).select("card_id").in(column, ids);
  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.card_id))];
}

export async function getCardsWithRelations(filters: CardFilters = {}): Promise<CardWithRelations[]> {
  const supabase = await createClient();

  let cardIdsFromTags: string[] | null = null;
  if (filters.tagIds && filters.tagIds.length > 0) {
    cardIdsFromTags = await cardIdsFromJoinTable(supabase, "card_tags", "tag_id", filters.tagIds);
    if (cardIdsFromTags.length === 0) return [];
  }

  let cardIdsFromResponsavel: string[] | null = null;
  if (filters.responsavelId) {
    cardIdsFromResponsavel = await cardIdsFromJoinTable(supabase, "card_responsaveis", "team_member_id", [
      filters.responsavelId,
    ]);
    if (cardIdsFromResponsavel.length === 0) return [];
  }

  let cardIdsFromModelo: string[] | null = null;
  if (filters.modeloId) {
    cardIdsFromModelo = await cardIdsFromJoinTable(supabase, "card_modelos", "modelo_id", [filters.modeloId]);
    if (cardIdsFromModelo.length === 0) return [];
  }

  let query = supabase.from("cards").select(CARD_SELECT).order("updated_at", { ascending: false });

  if (filters.cardTypeId) query = query.eq("card_type_id", filters.cardTypeId);
  if (filters.excludeCardTypeId) query = query.neq("card_type_id", filters.excludeCardTypeId);
  if (filters.statusId) query = query.eq("status_id", filters.statusId);
  if (filters.priorityId) query = query.eq("priority_id", filters.priorityId);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);
  if (cardIdsFromTags) query = query.in("id", cardIdsFromTags);
  if (cardIdsFromResponsavel) query = query.in("id", cardIdsFromResponsavel);
  if (cardIdsFromModelo) query = query.in("id", cardIdsFromModelo);

  if (filters.pendente) {
    const { data: excludedStatuses } = await supabase
      .from("statuses")
      .select("id")
      .in("key", ["concluido", "arquivado"]);
    const excludedIds = (excludedStatuses ?? []).map((s) => s.id);
    if (excludedIds.length > 0) query = query.not("status_id", "in", `(${excludedIds.join(",")})`);
  } else if (filters.hideConcluido && !filters.statusId) {
    // Um filtro de Status explícito (inclusive "Concluído") sempre tem prioridade
    // sobre a ocultação padrão de concluídos.
    const { data: concluidoStatus } = await supabase.from("statuses").select("id").eq("key", "concluido").maybeSingle();
    if (concluidoStatus) query = query.neq("status_id", concluidoStatus.id);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as unknown as CardWithRelations[];
}

export type LookupRow = { id: string; label: string };

export type CardLookups = {
  cardTypes: { id: string; key: string; label: string; emoji: string }[];
  statuses: { id: string; key: string; label: string; color: string }[];
  priorities: { id: string; key: string; label: string; color: string }[];
  modelos: { id: string; name: string }[];
  teamMembers: { id: string; full_name: string }[];
  tags: { id: string; name: string }[];
};

export const getCardLookups = cache(async function getCardLookups(): Promise<CardLookups> {
  const supabase = await createClient();

  const [cardTypes, statuses, priorities, modelos, teamMembers, tags] = await Promise.all([
    supabase.from("card_types").select("id, key, label, emoji").eq("is_active", true).order("sort_order"),
    supabase.from("statuses").select("id, key, label, color").eq("is_active", true).order("sort_order"),
    supabase.from("priorities").select("id, key, label, color").eq("is_active", true).order("sort_order"),
    supabase.from("modelos").select("id, name").eq("is_active", true).order("name"),
    supabase.from("team_members").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase.from("tags").select("id, name").order("name"),
  ]);

  for (const result of [cardTypes, statuses, priorities, modelos, teamMembers, tags]) {
    if (result.error) throw result.error;
  }

  return {
    cardTypes: cardTypes.data ?? [],
    statuses: statuses.data ?? [],
    priorities: priorities.data ?? [],
    modelos: modelos.data ?? [],
    teamMembers: teamMembers.data ?? [],
    tags: tags.data ?? [],
  };
});
