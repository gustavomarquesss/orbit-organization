"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { cardFormSchema, type CardFormInput } from "@/lib/validations/card";
import { getCardActivity, type CardActivityEntry } from "@/lib/queries/cards";
import { sendPushToMember } from "@/lib/push/notify";
import type { Json } from "@/lib/supabase/types";

export async function fetchCardActivity(cardId: string): Promise<CardActivityEntry[]> {
  return getCardActivity(cardId);
}

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

// Só cards de Reunião podem ter mais de 1 responsável; os demais tipos
// (Vídeo/Foto/Funil/Referência/Conteúdo/Anotação) são de responsável único,
// o que é o que torna o ranking mensal por pessoa possível.
async function validateResponsavelCount(
  supabase: SupabaseClient,
  cardTypeId: string,
  responsavelIds: string[],
): Promise<string | null> {
  if (responsavelIds.length <= 1) return null;
  const { data: cardType } = await supabase.from("card_types").select("key").eq("id", cardTypeId).maybeSingle();
  if (cardType?.key === "reuniao") return null;
  return "Esse tipo de card aceita apenas 1 responsável.";
}

type CardActivityEventType =
  | "created"
  | "updated"
  | "status_changed"
  | "assignee_added"
  | "assignee_removed";

async function logCardActivity(
  supabase: SupabaseClient,
  cardId: string,
  actorId: string | null,
  eventType: CardActivityEventType,
  payload: Record<string, unknown> = {},
) {
  await supabase
    .from("card_activity")
    .insert({ card_id: cardId, actor_id: actorId, event_type: eventType, payload: payload as Json });
}

// Avisa os demais membros da equipe que uma nova tarefa foi criada. Não é
// crítico para a criação do card em si, então falhas aqui não devem impedir
// o retorno de sucesso da action.
async function notifyCardCreated(
  supabase: SupabaseClient,
  cardId: string,
  title: string,
  creatorId: string,
  priorityId: string,
) {
  try {
    const [{ data: members }, { data: creator }, { data: priority }] = await Promise.all([
      supabase.from("team_members").select("id, full_name").eq("is_active", true).neq("id", creatorId),
      supabase.from("team_members").select("full_name").eq("id", creatorId).maybeSingle(),
      supabase.from("priorities").select("key").eq("id", priorityId).maybeSingle(),
    ]);

    if (!members || members.length === 0) return;

    const isUrgente = priority?.key === "urgente";
    const payload = {
      title: isUrgente ? "🔴 Tarefa urgente" : "Nova tarefa",
      body: `${creator?.full_name ?? "Alguém"} adicionou a tarefa "${title}"${isUrgente ? " (urgente)" : ""}`,
      url: `/cards/${cardId}`,
    };

    await Promise.all(members.map((member) => sendPushToMember(supabase, member.id, payload)));
  } catch {
    // notificação é best-effort; erros aqui não devem quebrar a criação do card
  }
}

// Avisa especificamente quem foi adicionado como responsável a um card já
// existente (diferente de notifyCardCreated, que avisa todo mundo).
async function notifyCardAssigned(
  supabase: SupabaseClient,
  cardId: string,
  title: string,
  actorId: string | null,
  assignedIds: string[],
) {
  try {
    const recipientIds = assignedIds.filter((memberId) => memberId !== actorId);
    if (recipientIds.length === 0) return;

    const { data: actor } = actorId
      ? await supabase.from("team_members").select("full_name").eq("id", actorId).maybeSingle()
      : { data: null };

    const payload = {
      title: "Nova responsabilidade",
      body: `${actor?.full_name ?? "Alguém"} te atribuiu a tarefa "${title}"`,
      url: `/cards/${cardId}`,
    };

    await Promise.all(recipientIds.map((memberId) => sendPushToMember(supabase, memberId, payload)));
  } catch {
    // notificação é best-effort; erros aqui não devem quebrar a atualização do card
  }
}

// Avisa os demais membros da equipe que uma tarefa foi concluída. Também
// best-effort: falhas aqui não devem impedir o salvamento do card.
async function notifyCardCompleted(supabase: SupabaseClient, cardId: string, title: string, actorId: string) {
  try {
    const [{ data: members }, { data: actor }] = await Promise.all([
      supabase.from("team_members").select("id, full_name").eq("is_active", true).neq("id", actorId),
      supabase.from("team_members").select("full_name").eq("id", actorId).maybeSingle(),
    ]);

    if (!members || members.length === 0) return;

    const payload = {
      title: "Tarefa concluída",
      body: `${actor?.full_name ?? "Alguém"} concluiu a tarefa "${title}"`,
      url: `/cards/${cardId}`,
    };

    await Promise.all(members.map((member) => sendPushToMember(supabase, member.id, payload)));
  } catch {
    // notificação é best-effort; erros aqui não devem quebrar a atualização do card
  }
}

// Avisa os demais membros que um card já concluído voltou a ficar em aberto
// (retrabalho). Mesmo padrão de notifyCardCompleted, best-effort.
async function notifyCardReopened(supabase: SupabaseClient, cardId: string, title: string, actorId: string) {
  try {
    const [{ data: members }, { data: actor }] = await Promise.all([
      supabase.from("team_members").select("id, full_name").eq("is_active", true).neq("id", actorId),
      supabase.from("team_members").select("full_name").eq("id", actorId).maybeSingle(),
    ]);

    if (!members || members.length === 0) return;

    const payload = {
      title: "Tarefa reaberta",
      body: `${actor?.full_name ?? "Alguém"} reabriu a tarefa "${title}"`,
      url: `/cards/${cardId}`,
    };

    await Promise.all(members.map((member) => sendPushToMember(supabase, member.id, payload)));
  } catch {
    // notificação é best-effort; erros aqui não devem quebrar a atualização do card
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

  const responsavelError = await validateResponsavelCount(supabase, rest.card_type_id, responsavel_ids);
  if (responsavelError) return { error: responsavelError };

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
  await logCardActivity(supabase, card.id, user.id, "created");
  await notifyCardCreated(supabase, card.id, rest.title, user.id, rest.priority_id);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actorId = user?.id ?? null;

  const { tag_ids, responsavel_ids, modelo_ids, description, observacoes, recorrencia, prazo_data, prazo_hora, ...rest } =
    parsed.data;

  const responsavelError = await validateResponsavelCount(supabase, rest.card_type_id, responsavel_ids);
  if (responsavelError) return { error: responsavelError };

  const [{ data: previousCard }, { data: previousResponsaveis }] = await Promise.all([
    supabase.from("cards").select("status_id").eq("id", id).maybeSingle(),
    supabase.from("card_responsaveis").select("team_member_id").eq("card_id", id),
  ]);

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

  if (previousCard && previousCard.status_id !== rest.status_id) {
    const { data: statuses } = await supabase
      .from("statuses")
      .select("id, label, key")
      .in("id", [previousCard.status_id, rest.status_id]);
    const fromStatus = statuses?.find((s) => s.id === previousCard.status_id);
    const toStatus = statuses?.find((s) => s.id === rest.status_id);
    await logCardActivity(supabase, id, actorId, "status_changed", {
      from_label: fromStatus?.label ?? null,
      to_label: toStatus?.label ?? null,
    });

    if (actorId && toStatus?.key === "concluido" && fromStatus?.key !== "concluido") {
      await notifyCardCompleted(supabase, id, rest.title, actorId);
    } else if (actorId && fromStatus?.key === "concluido" && toStatus?.key !== "concluido") {
      await notifyCardReopened(supabase, id, rest.title, actorId);
    }
  }

  const previousResponsavelIds = new Set((previousResponsaveis ?? []).map((r) => r.team_member_id));
  const nextResponsavelIds = new Set(responsavel_ids);
  const addedIds = responsavel_ids.filter((rid) => !previousResponsavelIds.has(rid));
  const removedIds = [...previousResponsavelIds].filter((rid) => !nextResponsavelIds.has(rid));

  if (addedIds.length > 0 || removedIds.length > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select("id, full_name")
      .in("id", [...addedIds, ...removedIds]);
    const nameById = new Map((members ?? []).map((m) => [m.id, m.full_name]));

    for (const memberId of addedIds) {
      await logCardActivity(supabase, id, actorId, "assignee_added", {
        team_member_id: memberId,
        team_member_name: nameById.get(memberId) ?? null,
      });
    }
    for (const memberId of removedIds) {
      await logCardActivity(supabase, id, actorId, "assignee_removed", {
        team_member_id: memberId,
        team_member_name: nameById.get(memberId) ?? null,
      });
    }

    if (addedIds.length > 0) {
      await notifyCardAssigned(supabase, id, rest.title, actorId, addedIds);
    }
  }

  await logCardActivity(supabase, id, actorId, "updated");

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
        .select("tipo, valor, gasto_por_id, data_inicio, recorrencia")
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

  await logCardActivity(supabase, newCard.id, user.id, "created");
  await notifyCardCreated(supabase, newCard.id, `${original.title} (cópia)`, user.id, original.priority_id);

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

