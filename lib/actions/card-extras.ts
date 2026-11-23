"use server";

import { revalidatePath } from "next/cache";

import { getAccess } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { todayBRT } from "@/lib/utils/brt";

export type ExtrasResult = { error?: string; id?: string };

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function refresh() {
  // O quadro/lista de cards mostra capa e progresso do checklist.
  revalidatePath("/cards");
  revalidatePath("/");
}

async function requireEdit() {
  const access = await getAccess();
  if (!access) return { error: "Sessão expirada. Entre novamente." } as const;
  if (!can(access, "cards_edit")) return { error: "Você não tem permissão para fazer isso." } as const;
  return { access } as const;
}

// Mantém o histórico do dia de um checklist diário igual ao estado atual dos itens.
async function syncDailyLog(supabase: SupabaseClient, checklistId: string) {
  const { data: list } = await supabase.from("card_checklists").select("repeat_daily").eq("id", checklistId).maybeSingle();
  if (!list?.repeat_daily) return;

  const today = todayBRT();
  const { data: items } = await supabase.from("card_checklist_items").select("done_on").eq("checklist_id", checklistId);
  const total = items?.length ?? 0;
  const done = (items ?? []).filter((item) => item.done_on === today).length;

  await supabase
    .from("checklist_daily_log")
    .upsert({ checklist_id: checklistId, log_date: today, done_count: done, total_count: total });
}

// ---------- Checklists ----------

export async function addChecklist(cardId: string, title: string, repeatDaily: boolean): Promise<ExtrasResult> {
  const auth = await requireEdit();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("card_checklists")
    .select("sort_order")
    .eq("card_id", cardId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("card_checklists")
    .insert({
      card_id: cardId,
      title: title.trim().slice(0, 120) || "Checklist",
      repeat_daily: repeatDaily,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível criar o checklist." };
  refresh();
  return { id: data.id };
}

export async function updateChecklist(
  checklistId: string,
  fields: { title?: string; repeat_daily?: boolean },
): Promise<ExtrasResult> {
  const auth = await requireEdit();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  const update: { title?: string; repeat_daily?: boolean } = {};
  if (fields.title !== undefined) {
    const title = fields.title.trim().slice(0, 120);
    if (!title) return { error: "Informe um título." };
    update.title = title;
  }

  if (fields.repeat_daily !== undefined) {
    update.repeat_daily = fields.repeat_daily;
    // Trocar o modo recomeça o checklist do zero para não misturar os dois tipos de marcação.
    await supabase.from("card_checklist_items").update({ done: false, done_on: null }).eq("checklist_id", checklistId);
    if (!fields.repeat_daily) await supabase.from("checklist_daily_log").delete().eq("checklist_id", checklistId);
  }

  const { error } = await supabase.from("card_checklists").update(update).eq("id", checklistId);
  if (error) return { error: "Não foi possível salvar." };

  if (fields.repeat_daily) await syncDailyLog(supabase, checklistId);
  refresh();
  return {};
}

export async function deleteChecklist(checklistId: string): Promise<ExtrasResult> {
  const auth = await requireEdit();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase.from("card_checklists").delete().eq("id", checklistId);
  if (error) return { error: "Não foi possível excluir o checklist." };
  refresh();
  return {};
}

// Aceita várias linhas de uma vez (cola uma lista e vira vários itens).
export async function addChecklistItems(
  checklistId: string,
  text: string,
): Promise<ExtrasResult & { items?: { id: string; text: string; sort_order: number }[] }> {
  const auth = await requireEdit();
  if ("error" in auth) return { error: auth.error };

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\[[ xX]?\])\s*/, "").trim())
    .filter(Boolean)
    .map((line) => line.slice(0, 300));
  if (lines.length === 0) return { error: "Escreva o texto do item." };
  if (lines.length > 50) return { error: "Máximo de 50 itens por vez." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("card_checklist_items")
    .select("sort_order")
    .eq("checklist_id", checklistId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const start = (last?.sort_order ?? 0) + 1;
  const { data, error } = await supabase
    .from("card_checklist_items")
    .insert(lines.map((line, index) => ({ checklist_id: checklistId, text: line, sort_order: start + index })))
    .select("id, text, sort_order");

  if (error || !data) return { error: "Não foi possível adicionar o item." };
  await syncDailyLog(supabase, checklistId);
  refresh();
  return { items: data };
}

export async function toggleChecklistItem(itemId: string, done: boolean): Promise<ExtrasResult> {
  const auth = await requireEdit();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("card_checklist_items")
    .select("checklist_id, card_checklists(repeat_daily)")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { error: "Item não encontrado." };

  const repeatDaily = Boolean(item.card_checklists?.repeat_daily);
  const { error } = await supabase
    .from("card_checklist_items")
    .update(repeatDaily ? { done: false, done_on: done ? todayBRT() : null } : { done, done_on: null })
    .eq("id", itemId);
  if (error) return { error: "Não foi possível atualizar o item." };

  await syncDailyLog(supabase, item.checklist_id);
  refresh();
  return {};
}

export async function updateChecklistItemText(itemId: string, text: string): Promise<ExtrasResult> {
  const auth = await requireEdit();
  if ("error" in auth) return { error: auth.error };

  const value = text.trim().slice(0, 300);
  if (!value) return { error: "Escreva o texto do item." };

  const supabase = await createClient();
  const { error } = await supabase.from("card_checklist_items").update({ text: value }).eq("id", itemId);
  if (error) return { error: "Não foi possível salvar." };
  return {};
}

export async function deleteChecklistItem(itemId: string): Promise<ExtrasResult> {
  const auth = await requireEdit();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  const { data: item } = await supabase.from("card_checklist_items").select("checklist_id").eq("id", itemId).maybeSingle();
  const { error } = await supabase.from("card_checklist_items").delete().eq("id", itemId);
  if (error) return { error: "Não foi possível excluir o item." };

  if (item) await syncDailyLog(supabase, item.checklist_id);
  refresh();
  return {};
}

// Zera todos os itens de um checklist (útil em checklists comuns que se repetem de vez em quando).
export async function resetChecklist(checklistId: string): Promise<ExtrasResult> {
  const auth = await requireEdit();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("card_checklist_items")
    .update({ done: false, done_on: null })
    .eq("checklist_id", checklistId);
  if (error) return { error: "Não foi possível zerar o checklist." };

  await syncDailyLog(supabase, checklistId);
  refresh();
  return {};
}

// ---------- Comentários ----------

export async function addComment(cardId: string, body: string): Promise<ExtrasResult> {
  const access = await getAccess();
  if (!access) return { error: "Sessão expirada. Entre novamente." };
  if (!can(access, "cards")) return { error: "Você não tem permissão para fazer isso." };

  const text = body.trim();
  if (!text) return { error: "Escreva um comentário." };
  if (text.length > 4000) return { error: "Comentário muito longo." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_comments")
    .insert({ card_id: cardId, author_id: access.userId, body: text })
    .select("id")
    .single();
  if (error || !data) return { error: "Não foi possível comentar." };
  return { id: data.id };
}

export async function deleteComment(commentId: string): Promise<ExtrasResult> {
  const access = await getAccess();
  if (!access) return { error: "Sessão expirada. Entre novamente." };

  const supabase = await createClient();
  const { data: comment } = await supabase.from("card_comments").select("author_id").eq("id", commentId).maybeSingle();
  if (!comment) return {};
  if (comment.author_id !== access.userId && !access.isAdmin) {
    return { error: "Só quem escreveu (ou o admin) pode excluir o comentário." };
  }

  const { error } = await supabase.from("card_comments").delete().eq("id", commentId);
  if (error) return { error: "Não foi possível excluir o comentário." };
  return {};
}

// ---------- Links ----------

function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function addLink(
  cardId: string,
  url: string,
  title: string,
): Promise<ExtrasResult & { link?: { id: string; title: string | null; url: string; created_at: string } }> {
  const auth = await requireEdit();
  if ("error" in auth) return { error: auth.error };

  const normalized = normalizeUrl(url);
  if (!normalized) return { error: "Informe um link válido (http ou https)." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_links")
    .insert({ card_id: cardId, url: normalized, title: title.trim().slice(0, 120) || null })
    .select("id, title, url, created_at")
    .single();
  if (error || !data) return { error: "Não foi possível adicionar o link." };
  return { link: data };
}

export async function deleteLink(linkId: string): Promise<ExtrasResult> {
  const auth = await requireEdit();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase.from("card_links").delete().eq("id", linkId);
  if (error) return { error: "Não foi possível excluir o link." };
  return {};
}

// ---------- Capa ----------

export async function setCardCover(cardId: string, color: string | null): Promise<ExtrasResult> {
  const auth = await requireEdit();
  if ("error" in auth) return { error: auth.error };
  if (color !== null && !HEX_COLOR.test(color)) return { error: "Cor inválida." };

  const supabase = await createClient();
  const { error } = await supabase.from("cards").update({ cover_color: color }).eq("id", cardId);
  if (error) return { error: "Não foi possível salvar a capa." };
  refresh();
  return {};
}
