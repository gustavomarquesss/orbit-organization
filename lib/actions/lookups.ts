"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type LookupTable = "card_types" | "statuses" | "priorities" | "modelos" | "tags";

export type LookupActionResult = { error?: string };

function revalidateSettings() {
  revalidatePath("/configuracoes", "layout");
}

export async function createLookupItem(
  table: LookupTable,
  data: Record<string, unknown>,
): Promise<LookupActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from(table).insert(data as never);

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
  const supabase = await createClient();
  const { error } = await supabase.from(table).update(data as never).eq("id", id);

  if (error) return { error: "Não foi possível salvar." };
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

export async function deleteLookupItem(table: LookupTable, id: string): Promise<LookupActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) return { error: "Não foi possível excluir." };
  revalidateSettings();
  return {};
}
