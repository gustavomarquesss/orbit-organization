"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type LookupTable = "card_types" | "statuses" | "priorities" | "modelos" | "tags";

export type LookupActionResult = { error?: string };

// Chaves que o código usa para decidir comportamento (conclusão, recorrência, urgência,
// aba Financeiro, reuniões...). Esses itens podem ser renomeados/recoloridos, mas não excluídos.
const PROTECTED_KEYS: Partial<Record<LookupTable, string[]>> = {
  statuses: ["a_fazer", "concluido", "arquivado"],
  priorities: ["urgente"],
  card_types: ["financeiro", "reuniao"],
};

// Campos que a tela de configurações pode alterar em cada tabela (a chave nunca muda).
const EDITABLE_FIELDS: Record<LookupTable, string[]> = {
  card_types: ["label", "emoji", "is_active", "sort_order"],
  statuses: ["label", "color", "is_active", "sort_order"],
  priorities: ["label", "color", "is_active", "sort_order"],
  modelos: ["name", "is_active"],
  tags: ["name"],
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function revalidateSettings() {
  revalidatePath("/configuracoes", "layout");
  revalidatePath("/cards");
  revalidatePath("/");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function validateFields(data: Record<string, unknown>): string | null {
  for (const field of ["label", "name"]) {
    if (field in data) {
      const value = data[field];
      if (typeof value !== "string" || !value.trim()) return "Informe um nome.";
      if (value.trim().length > 80) return "Nome muito longo.";
    }
  }
  if ("color" in data && !(typeof data.color === "string" && HEX_COLOR.test(data.color))) return "Cor inválida.";
  if ("emoji" in data && (typeof data.emoji !== "string" || data.emoji.trim().length === 0 || data.emoji.length > 8)) {
    return "Informe um emoji.";
  }
  return null;
}

function pickEditable(table: LookupTable, data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS[table]) {
    if (field in data) {
      const value = data[field];
      out[field] = typeof value === "string" ? value.trim() : value;
    }
  }
  return out;
}

export async function createLookupItem(
  table: LookupTable,
  data: Record<string, unknown>,
): Promise<LookupActionResult> {
  const denied = await checkPermission("configuracoes");
  if (denied) return { error: denied };

  const fields = pickEditable(table, data);
  const invalid = validateFields(fields);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const payload: Record<string, unknown> = { ...fields };

  if (table === "card_types" || table === "statuses" || table === "priorities") {
    const label = String(fields.label ?? "");
    const baseKey = slugify(label) || "item";

    const { data: existing } = await supabase.from(table).select("key, sort_order");
    const keys = new Set((existing ?? []).map((row) => row.key));
    let key = baseKey;
    for (let n = 2; keys.has(key); n++) key = `${baseKey}_${n}`;

    payload.key = key;
    payload.sort_order = Math.max(0, ...(existing ?? []).map((row) => row.sort_order)) + 1;
  }

  const { error } = await supabase.from(table).insert(payload as never);

  if (error) {
    return { error: error.code === "23505" ? "Já existe um registro com esse valor." : "Não foi possível criar." };
  }
  revalidateSettings();
  return {};
}

export async function updateLookupItem(
  table: LookupTable,
  id: string,
  data: Record<string, unknown>,
): Promise<LookupActionResult> {
  const denied = await checkPermission("configuracoes");
  if (denied) return { error: denied };

  const fields = pickEditable(table, data);
  if (Object.keys(fields).length === 0) return { error: "Nada para salvar." };
  const invalid = validateFields(fields);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.from(table).update(fields as never).eq("id", id);

  if (error) {
    return { error: error.code === "23505" ? "Já existe um registro com esse valor." : "Não foi possível salvar." };
  }
  revalidateSettings();
  return {};
}

export async function toggleLookupActive(
  table: LookupTable,
  id: string,
  is_active: boolean,
): Promise<LookupActionResult> {
  return updateLookupItem(table, id, { is_active });
}

// Quantos cards usam o item. Para modelos e tags, é só quantos cards perdem o vínculo ao excluir.
export async function getLookupUsage(
  table: LookupTable,
  id: string,
): Promise<{ count: number; protected: boolean; error?: string }> {
  const denied = await checkPermission("configuracoes");
  if (denied) return { count: 0, protected: false, error: denied };

  const supabase = await createClient();

  const usageQuery =
    table === "card_types"
      ? supabase.from("cards").select("id", { count: "exact", head: true }).eq("card_type_id", id)
      : table === "statuses"
        ? supabase.from("cards").select("id", { count: "exact", head: true }).eq("status_id", id)
        : table === "priorities"
          ? supabase.from("cards").select("id", { count: "exact", head: true }).eq("priority_id", id)
          : table === "modelos"
            ? supabase.from("card_modelos").select("card_id", { count: "exact", head: true }).eq("modelo_id", id)
            : supabase.from("card_tags").select("card_id", { count: "exact", head: true }).eq("tag_id", id);
  const { count } = await usageQuery;

  let isProtected = false;
  const protectedKeys = PROTECTED_KEYS[table];
  if (protectedKeys && (table === "card_types" || table === "statuses" || table === "priorities")) {
    const { data: row } = await supabase.from(table).select("key").eq("id", id).maybeSingle();
    isProtected = Boolean(row && protectedKeys.includes(row.key));
  }

  return { count: count ?? 0, protected: isProtected };
}

export async function deleteLookupItem(table: LookupTable, id: string): Promise<LookupActionResult> {
  const denied = await checkPermission("configuracoes");
  if (denied) return { error: denied };

  const usage = await getLookupUsage(table, id);
  if (usage.error) return { error: usage.error };
  if (usage.protected) {
    return { error: "Este item é usado pelo sistema e não pode ser excluído. Você pode renomeá-lo ou desativá-lo." };
  }

  const supabase = await createClient();

  if (table === "modelos") {
    // Limpa o vínculo nos cards antes de excluir (a FK não tem cascade).
    await supabase.from("card_modelos").delete().eq("modelo_id", id);
  } else if (table === "tags") {
    await supabase.from("card_tags").delete().eq("tag_id", id);
  } else if (usage.count > 0) {
    return {
      error: `Usado em ${usage.count} card${usage.count > 1 ? "s" : ""}. Mude esses cards para outro item ou desative este em vez de excluir.`,
    };
  }

  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    return { error: "Não foi possível excluir. Se ele ainda estiver em uso, desative em vez de excluir." };
  }
  revalidateSettings();
  return {};
}

// Troca a posição do item com o vizinho (a ordem define colunas do Kanban, selects e filtros).
export async function moveLookupItem(
  table: "card_types" | "statuses" | "priorities",
  id: string,
  direction: "up" | "down",
): Promise<LookupActionResult> {
  const denied = await checkPermission("configuracoes");
  if (denied) return { error: denied };

  const supabase = await createClient();
  const { data, error } = await supabase.from(table).select("id, sort_order, label").order("sort_order").order("label");
  if (error || !data) return { error: "Não foi possível reordenar." };

  const index = data.findIndex((row) => row.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= data.length) return {};

  const reordered = [...data];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  // Reatribui 1..n para eliminar empates e manter a ordem estável.
  const updates = reordered
    .map((row, position) => ({ id: row.id, sort_order: position + 1, previous: row.sort_order }))
    .filter((row) => row.sort_order !== row.previous);

  const results = await Promise.all(
    updates.map((row) => supabase.from(table).update({ sort_order: row.sort_order }).eq("id", row.id)),
  );
  if (results.some((r) => r.error)) return { error: "Não foi possível reordenar." };

  revalidateSettings();
  return {};
}
