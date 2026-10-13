"use server";

import { checkPermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type CreateTagResult = { error?: string; data?: { id: string; name: string } };

export async function createTag(name: string): Promise<CreateTagResult> {
  const denied = await checkPermission("cards_edit", "financeiro_edit", "configuracoes");
  if (denied) return { error: denied };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Nome inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").insert({ name: trimmed }).select("id, name").single();

  if (error) {
    if (error.code === "23505") return { error: "Essa tag já existe." };
    return { error: "Não foi possível criar a tag." };
  }

  return { data };
}
