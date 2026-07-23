import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import { sendPushToMember } from "@/lib/push/notify";

export const dynamic = "force-dynamic";

// Cadência esperada do disparo (pg_cron a cada 15min); um pouco maior que
// isso pra tolerar atraso do disparo sem nunca duplicar (o unique de
// notification_log é quem garante isso, não a janela em si).
const WINDOW_MS = 16 * 60 * 1000;
const DIGEST_HOUR_BRT = "08:00:00";
const TZ_OFFSET = "-03:00";

type SupabaseService = ReturnType<typeof createServiceClient>;

type EventItem = {
  cardId: string;
  title: string;
  date: string;
  time: string | null;
  recipients: string[];
  category: "reuniao" | "prazo";
};

function saoPauloDate(offsetDays: number): string {
  const now = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

function inWindow(target: Date, now: Date): boolean {
  return target.getTime() <= now.getTime() && now.getTime() < target.getTime() + WINDOW_MS;
}

// Insere a marca de "já avisado" antes de enviar. Se a linha já existir
// (unique card_id+kind+target_at), a inserção falha e não reenviamos —
// mesmo que duas execuções do cron se sobreponham.
async function tryClaim(
  supabase: SupabaseService,
  cardId: string,
  kind: "reminder_1h" | "morning_digest",
  targetAt: Date,
): Promise<boolean> {
  const { error } = await supabase
    .from("notification_log")
    .insert({ card_id: cardId, kind, target_at: targetAt.toISOString() });
  return !error;
}

async function processEvent(
  supabase: SupabaseService,
  event: EventItem,
  now: Date,
  today: string,
  digestDue: boolean,
): Promise<number> {
  let sent = 0;
  if (event.recipients.length === 0) return sent;

  if (event.time) {
    const eventDateTime = new Date(`${event.date}T${event.time}${TZ_OFFSET}`);
    const targetAt = new Date(eventDateTime.getTime() - 60 * 60 * 1000);
    if (inWindow(targetAt, now) && (await tryClaim(supabase, event.cardId, "reminder_1h", targetAt))) {
      const payload = {
        title: event.category === "reuniao" ? `Reunião em 1h: ${event.title}` : `Prazo em 1h: ${event.title}`,
        body: `Hoje às ${event.time.slice(0, 5)}`,
        url: `/cards/${event.cardId}`,
      };
      for (const memberId of event.recipients) {
        sent += (await sendPushToMember(supabase, memberId, payload)).sent;
      }
    }
  }

  if (digestDue && event.date === today) {
    const digestAnchor = new Date(`${today}T${DIGEST_HOUR_BRT}${TZ_OFFSET}`);
    if (await tryClaim(supabase, event.cardId, "morning_digest", digestAnchor)) {
      const payload = {
        title: event.category === "reuniao" ? `Hoje: Reunião — ${event.title}` : `Hoje: Prazo — ${event.title}`,
        body: event.time ? `Às ${event.time.slice(0, 5)}` : "Sem horário definido",
        url: `/cards/${event.cardId}`,
      };
      for (const memberId of event.recipients) {
        sent += (await sendPushToMember(supabase, memberId, payload)).sent;
      }
    }
  }

  return sent;
}

async function handle(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.NOTIFICATIONS_CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const today = saoPauloDate(0);
  const tomorrow = saoPauloDate(1);
  const digestAnchor = new Date(`${today}T${DIGEST_HOUR_BRT}${TZ_OFFSET}`);
  const digestDue = inWindow(digestAnchor, now);

  const events: EventItem[] = [];

  const { data: meetings } = await supabase
    .from("meeting_details")
    .select("card_id, meeting_date, meeting_time")
    .in("meeting_date", [today, tomorrow]);

  if (meetings && meetings.length > 0) {
    const cardIds = meetings.map((m) => m.card_id);
    const [{ data: meetingCards }, { data: participants }] = await Promise.all([
      supabase
        .from("cards")
        .select("id, title, status:statuses!cards_status_id_fkey(key)")
        .in("id", cardIds),
      supabase.from("meeting_participants").select("card_id, team_member_id").in("card_id", cardIds),
    ]);

    for (const meeting of meetings) {
      const card = (meetingCards as unknown as { id: string; title: string; status: { key: string } | null }[] | null)?.find(
        (c) => c.id === meeting.card_id,
      );
      if (!card || card.status?.key === "concluido" || card.status?.key === "arquivado") continue;
      events.push({
        cardId: meeting.card_id,
        title: card.title,
        date: meeting.meeting_date,
        time: meeting.meeting_time,
        recipients: (participants ?? [])
          .filter((p) => p.card_id === meeting.card_id)
          .map((p) => p.team_member_id),
        category: "reuniao",
      });
    }
  }

  const { data: prazoCards } = await supabase
    .from("cards")
    .select("id, title, prazo_data, prazo_hora, status:statuses!cards_status_id_fkey(key)")
    .in("prazo_data", [today, tomorrow]);

  if (prazoCards && prazoCards.length > 0) {
    const cardIds = (prazoCards as unknown as { id: string }[]).map((c) => c.id);
    const { data: responsaveis } = await supabase
      .from("card_responsaveis")
      .select("card_id, team_member_id")
      .in("card_id", cardIds);

    for (const card of prazoCards as unknown as {
      id: string;
      title: string;
      prazo_data: string;
      prazo_hora: string | null;
      status: { key: string } | null;
    }[]) {
      if (card.status?.key === "concluido" || card.status?.key === "arquivado") continue;
      events.push({
        cardId: card.id,
        title: card.title,
        date: card.prazo_data,
        time: card.prazo_hora,
        recipients: (responsaveis ?? [])
          .filter((r) => r.card_id === card.id)
          .map((r) => r.team_member_id),
        category: "prazo",
      });
    }
  }

  let totalSent = 0;
  for (const event of events) {
    totalSent += await processEvent(supabase, event, now, today, digestDue);
  }

  return NextResponse.json({ checked: events.length, sent: totalSent, digestDue });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
