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

async function syncCardModelos(supabase: SupabaseClient, cardId: string, modeloIds: string[]) {
  await supabase.from("card_modelos").delete().eq("card_id", cardId);
  if (modeloIds.length > 0) {
    await supabase.from("card_modelos").insert(modeloIds.map((modelo_id) => ({ card_id: cardId, modelo_id })));
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

  const { tag_ids, responsavel_ids, modelo_ids, description, observacoes, recorrencia, prazo_data, prazo_hora, ...rest } =
    parsed.data;

  const { data: card, error } = await supabase
    .from("cards")
    .insert({
      ...rest,
      description: description || null,
      observacoes: observacoes || null,
      recorrencia: recorrencia || null,
      prazo_data: prazo_data || null,
      prazo_hora: prazo_data ? prazo_hora || null : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !card) return { error: "Não foi possível criar o card." };

  await syncCardTags(supabase, card.id, tag_ids);
  await syncCardResponsaveis(supabase, card.id, responsavel_ids);
  await syncCardModelos(supabase, card.id, modelo_ids);

  revalidatePath("/cards");
  revalidatePath("/reunioes");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { id: card.id };
}

export async function updateCard(id: string, input: CardFormInput): Promise<CardActionResult> {
  const parsed = cardFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { tag_ids, responsavel_ids, modelo_ids, description, observacoes, recorrencia, prazo_data, prazo_hora, ...rest } =
    parsed.data;

  const { error } = await supabase
    .from("cards")
    .update({
      ...rest,
      description: description || null,
      observacoes: observacoes || null,
      recorrencia: recorrencia || null,
      prazo_data: prazo_data || null,
      prazo_hora: prazo_data ? prazo_hora || null : null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar o card." };

  await syncCardTags(supabase, id, tag_ids);
  await syncCardResponsaveis(supabase, id, responsavel_ids);
  await syncCardModelos(supabase, id, modelo_ids);

  revalidatePath("/cards");
  revalidatePath("/reunioes");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { id };
}

export async function deleteCard(id: string): Promise<CardActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o card." };

  revalidatePath("/cards");
  revalidatePath("/reunioes");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { id };
}

export async function duplicateCard(id: string): Promise<CardActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { data: original, error: fetchError } = await supabase
    .from("cards")
    .select("title, description, card_type_id, status_id, priority_id, observacoes, recorrencia, prazo_data, prazo_hora")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !original) return { error: "Card não encontrado." };

  const [{ data: tags }, { data: responsaveis }, { data: modelos }, { data: meeting }, { data: financeiro }] =
    await Promise.all([
      supabase.from("card_tags").select("tag_id").eq("card_id", id),
      supabase.from("card_responsaveis").select("team_member_id").eq("card_id", id),
      supabase.from("card_modelos").select("modelo_id").eq("card_id", id),
      supabase.from("meeting_details").select("meeting_date, meeting_time, assuntos").eq("card_id", id).maybeSingle(),
      supabase
        .from("financeiro_details")
        .select("valor, gasto_por_id, data_inicio, recorrencia")
        .eq("card_id", id)
        .maybeSingle(),
    ]);

  const { data: newCard, error } = await supabase
    .from("cards")
    .insert({
      title: `${original.title} (cópia)`,
      description: original.description,
      card_type_id: original.card_type_id,
      status_id: original.status_id,
      priority_id: original.priority_id,
      observacoes: original.observacoes,
      recorrencia: original.recorrencia,
      prazo_data: original.prazo_data,
      prazo_hora: original.prazo_hora,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !newCard) return { error: "Não foi possível duplicar o card." };

  await syncCardTags(supabase, newCard.id, (tags ?? []).map((t) => t.tag_id));
  await syncCardResponsaveis(supabase, newCard.id, (responsaveis ?? []).map((r) => r.team_member_id));
  await syncCardModelos(supabase, newCard.id, (modelos ?? []).map((m) => m.modelo_id));

  if (meeting) {
    await supabase.from("meeting_details").insert({ card_id: newCard.id, ...meeting });
    const { data: participants } = await supabase
      .from("meeting_participants")
      .select("team_member_id")
      .eq("card_id", id);
    if (participants && participants.length > 0) {
      await supabase
        .from("meeting_participants")
        .insert(participants.map((p) => ({ card_id: newCard.id, team_member_id: p.team_member_id })));
    }
  }

  if (financeiro) {
    await supabase.from("financeiro_details").insert({ card_id: newCard.id, ...financeiro });
  }

  revalidatePath("/cards");
  revalidatePath("/reunioes");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { id: newCard.id };
}

export async function bulkDeleteCards(ids: string[]): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { error } = await supabase.from("cards").delete().in("id", ids);
  if (error) return { error: "Não foi possível excluir os cards selecionados." };

  revalidatePath("/cards");
  revalidatePath("/reunioes");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return {};
}

export async function bulkDuplicateCards(ids: string[]): Promise<{ error?: string }> {
  for (const id of ids) {
    const result = await duplicateCard(id);
    if (result.error) return { error: result.error };
  }
  return {};
}
