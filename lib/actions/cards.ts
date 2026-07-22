"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { cardFormSchema, type CardFormInput } from "@/lib/validations/card";

export type CardActionResult = { error?: string; id?: string };

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function syncCardTags(supabase: SupabaseClient, cardId: string, tagIds: string[]) {
  await supabase.from("card_tags").delete().eq("card_id", cardId);
  if (tagIds.length > 0) {
    await supabase.from("card_tags").insert(tagIds.map((tag_id) => ({ card_id: cardId, tag_id })));
  }
}

async function syncCardResponsaveis(supabase: SupabaseClient, cardId: string, responsavelIds: string[]) {
  await supabase.from("card_responsaveis").delete().eq("card_id", cardId);
  if (responsavelIds.length > 0) {
    await supabase
      .from("card_responsaveis")
      .insert(responsavelIds.map((team_member_id) => ({ card_id: cardId, team_member_id })));
  }
}

export async function createCard(input: CardFormInput): Promise<CardActionResult> {
  const parsed = cardFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { tag_ids, responsavel_ids, description, observacoes, modelo_id, ...rest } = parsed.data;

  const { data: card, error } = await supabase
    .from("cards")
    .insert({
      ...rest,
      description: description || null,
      observacoes: observacoes || null,
      modelo_id: modelo_id || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !card) return { error: "Não foi possível criar o card." };

  await syncCardTags(supabase, card.id, tag_ids);
  await syncCardResponsaveis(supabase, card.id, responsavel_ids);

  revalidatePath("/cards");
  revalidatePath("/");
  return { id: card.id };
}

export async function updateCard(id: string, input: CardFormInput): Promise<CardActionResult> {
  const parsed = cardFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { tag_ids, responsavel_ids, description, observacoes, modelo_id, ...rest } = parsed.data;

  const { error } = await supabase
    .from("cards")
    .update({
      ...rest,
      description: description || null,
      observacoes: observacoes || null,
      modelo_id: modelo_id || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar o card." };

  await syncCardTags(supabase, id, tag_ids);
  await syncCardResponsaveis(supabase, id, responsavel_ids);

  revalidatePath("/cards");
  revalidatePath("/");
  return { id };
}

export async function deleteCard(id: string): Promise<CardActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o card." };

  revalidatePath("/cards");
  revalidatePath("/");
  return { id };
}
