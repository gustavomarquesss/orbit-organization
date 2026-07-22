"use server";

import { createClient } from "@/lib/supabase/server";

export type CreateTagResult = { error?: string; data?: { id: string; name: string } };

export async function createTag(name: string): Promise<CreateTagResult> {
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
