"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { meetingFieldsSchema, type MeetingFieldsInput } from "@/lib/validations/meeting";

export async function upsertMeetingDetails(
  cardId: string,
  input: MeetingFieldsInput,
): Promise<{ error?: string }> {
  const parsed = meetingFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados de reunião inválidos." };
  }

  const supabase = await createClient();
  const { participant_ids, meeting_date, meeting_time, assuntos } = parsed.data;

  const { error } = await supabase.from("meeting_details").upsert(
    {
      card_id: cardId,
      meeting_date,
      meeting_time: meeting_time || null,
      assuntos: assuntos || null,
    },
    { onConflict: "card_id" },
  );

  if (error) return { error: "Não foi possível salvar os detalhes da reunião." };

  await supabase.from("meeting_participants").delete().eq("card_id", cardId);
  if (participant_ids.length > 0) {
    await supabase
      .from("meeting_participants")
      .insert(participant_ids.map((team_member_id) => ({ card_id: cardId, team_member_id })));
  }

  revalidatePath("/cards");
  revalidatePath("/reunioes");
  revalidatePath("/");
  return {};
}

export async function deleteMeetingDetails(cardId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("meeting_details").delete().eq("card_id", cardId);
}
