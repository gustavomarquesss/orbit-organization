import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

const CARD_SELECT = `
  id, title, description, observacoes, created_at, updated_at,
  card_type:card_types!cards_card_type_id_fkey(id, key, label, emoji),
  status:statuses!cards_status_id_fkey(id, key, label, color),
  priority:priorities!cards_priority_id_fkey(id, key, label, color),
  responsavel:team_members!cards_responsavel_id_fkey(id, full_name, avatar_color),
  modelo:modelos!cards_modelo_id_fkey(id, name),
  card_tags(tag:tags(id, name))
`;

export type CardWithRelations = {
  id: string;
  title: string;
  description: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  card_type: { id: string; key: string; label: string; emoji: string } | null;
  status: { id: string; key: string; label: string; color: string } | null;
  priority: { id: string; key: string; label: string; color: string } | null;
  responsavel: { id: string; full_name: string; avatar_color: string } | null;
  modelo: { id: string; name: string } | null;
  card_tags: { tag: { id: string; name: string } | null }[];
};

export async function getCardById(id: string): Promise<CardWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cards").select(CARD_SELECT).eq("id", id).maybeSingle();

  if (error) throw error;
  return (data as unknown as CardWithRelations) ?? null;
}

export type CardFilters = {
  cardTypeId?: string;
  statusId?: string;
  priorityId?: string;
  responsavelId?: string;
  modeloId?: string;
  tagIds?: string[];
  from?: string;
  to?: string;
};

export async function getCardsWithRelations(filters: CardFilters = {}): Promise<CardWithRelations[]> {
  const supabase = await createClient();

  let cardIdsFromTags: string[] | null = null;
  if (filters.tagIds && filters.tagIds.length > 0) {
    const { data, error } = await supabase.from("card_tags").select("card_id").in("tag_id", filters.tagIds);
    if (error) throw error;
    cardIdsFromTags = [...new Set((data ?? []).map((row) => row.card_id))];
    if (cardIdsFromTags.length === 0) return [];
  }

  let query = supabase.from("cards").select(CARD_SELECT).order("updated_at", { ascending: false });

  if (filters.cardTypeId) query = query.eq("card_type_id", filters.cardTypeId);
  if (filters.statusId) query = query.eq("status_id", filters.statusId);
  if (filters.priorityId) query = query.eq("priority_id", filters.priorityId);
  if (filters.responsavelId) query = query.eq("responsavel_id", filters.responsavelId);
  if (filters.modeloId) query = query.eq("modelo_id", filters.modeloId);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);
  if (cardIdsFromTags) query = query.in("id", cardIdsFromTags);

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
