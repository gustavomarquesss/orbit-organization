import { createClient } from "@/lib/supabase/server";

export type MeetingDetails = {
  meeting_date: string;
  meeting_time: string | null;
  assuntos: string | null;
  participant_ids: string[];
};

export async function getMeetingDetails(cardId: string): Promise<MeetingDetails | null> {
  const supabase = await createClient();

  const [{ data: details }, { data: participants }] = await Promise.all([
    supabase.from("meeting_details").select("meeting_date, meeting_time, assuntos").eq("card_id", cardId).maybeSingle(),
    supabase.from("meeting_participants").select("team_member_id").eq("card_id", cardId),
  ]);

  if (!details) return null;

  return {
    meeting_date: details.meeting_date,
    meeting_time: details.meeting_time,
    assuntos: details.assuntos,
    participant_ids: (participants ?? []).map((p) => p.team_member_id),
  };
}
