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

type ReminderEvent = {
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
async function tryClaimReminder(supabase: SupabaseService, cardId: string, targetAt: Date): Promise<boolean> {
  const { error } = await supabase
    .from("notification_log")
    .insert({ card_id: cardId, kind: "reminder_1h", target_at: targetAt.toISOString() });
  return !error;
}

// Mesma ideia, mas por pessoa+dia (o resumo diário é agregado, não por
// card) — unique (team_member_id, digest_date) garante 1 envio por dia.
async function tryClaimMemberDigest(supabase: SupabaseService, teamMemberId: string, digestDate: string): Promise<boolean> {
  const { error } = await supabase
    .from("member_digest_log")
    .insert({ team_member_id: teamMemberId, digest_date: digestDate });
  return !error;
}

async function sendReminder(supabase: SupabaseService, event: ReminderEvent, now: Date): Promise<number> {
  if (event.recipients.length === 0 || !event.time) return 0;

  const eventDateTime = new Date(`${event.date}T${event.time}${TZ_OFFSET}`);
  const targetAt = new Date(eventDateTime.getTime() - 60 * 60 * 1000);
  if (!inWindow(targetAt, now) || !(await tryClaimReminder(supabase, event.cardId, targetAt))) return 0;

  const payload = {
    title: event.category === "reuniao" ? `Reunião em 1h: ${event.title}` : `Prazo em 1h: ${event.title}`,
    body: `Hoje às ${event.time.slice(0, 5)}`,
    url: `/cards/${event.cardId}`,
  };

  let sent = 0;
  for (const memberId of event.recipients) {
    sent += (await sendPushToMember(supabase, memberId, payload)).sent;
  }
  return sent;
}

// Resumo diário único por pessoa ("Seu dia"): tarefas com prazo hoje,
// reuniões hoje e tarefas atrasadas — tudo num só push, em vez de um
// aviso por card. Enviado uma vez por dia, e repete nos dias seguintes
// enquanto ainda houver pendência (o que cobre o caso de tarefa atrasada
// sendo esquecida).
async function sendMemberDigests(supabase: SupabaseService, today: string): Promise<number> {
  const [{ data: prazoCards }, { data: meetingsToday }] = await Promise.all([
    supabase
      .from("cards")
      .select("id, prazo_data, status:statuses!cards_status_id_fkey(key)")
      .not("prazo_data", "is", null)
      .lte("prazo_data", today),
    supabase.from("meeting_details").select("card_id").eq("meeting_date", today),
  ]);

  const activeCards = (
    (prazoCards ?? []) as unknown as { id: string; prazo_data: string; status: { key: string } | null }[]
  ).filter((c) => c.status?.key !== "concluido" && c.status?.key !== "arquivado");

  const todayCardIds = new Set(activeCards.filter((c) => c.prazo_data === today).map((c) => c.id));
  const overdueCardIds = new Set(activeCards.filter((c) => c.prazo_data < today).map((c) => c.id));
  const meetingCardIds = (meetingsToday ?? []).map((m) => m.card_id);

  const prazoCardIds = [...todayCardIds, ...overdueCardIds];

  const [{ data: responsaveis }, { data: participants }] = await Promise.all([
    prazoCardIds.length > 0
      ? supabase.from("card_responsaveis").select("card_id, team_member_id").in("card_id", prazoCardIds)
      : Promise.resolve({ data: [] as { card_id: string; team_member_id: string }[] }),
    meetingCardIds.length > 0
      ? supabase.from("meeting_participants").select("card_id, team_member_id").in("card_id", meetingCardIds)
      : Promise.resolve({ data: [] as { card_id: string; team_member_id: string }[] }),
  ]);

  const counts = new Map<string, { hoje: number; atrasada: number; reuniao: number }>();
  const bump = (memberId: string, key: "hoje" | "atrasada" | "reuniao") => {
    const current = counts.get(memberId) ?? { hoje: 0, atrasada: 0, reuniao: 0 };
    current[key] += 1;
    counts.set(memberId, current);
  };

  for (const r of responsaveis ?? []) {
    if (todayCardIds.has(r.card_id)) bump(r.team_member_id, "hoje");
    if (overdueCardIds.has(r.card_id)) bump(r.team_member_id, "atrasada");
  }
  for (const p of participants ?? []) {
    bump(p.team_member_id, "reuniao");
  }

  let sent = 0;
  for (const [memberId, count] of counts) {
    if (count.hoje + count.atrasada + count.reuniao === 0) continue;
    if (!(await tryClaimMemberDigest(supabase, memberId, today))) continue;

    const parts: string[] = [];
    if (count.hoje > 0) parts.push(`${count.hoje} tarefa${count.hoje > 1 ? "s" : ""} para hoje`);
    if (count.reuniao > 0) parts.push(`${count.reuniao} reunião${count.reuniao > 1 ? "ões" : ""} hoje`);
    if (count.atrasada > 0) parts.push(`${count.atrasada} atrasada${count.atrasada > 1 ? "s" : ""}`);

    const payload = { title: "Seu dia", body: parts.join(", "), url: "/cards" };
    sent += (await sendPushToMember(supabase, memberId, payload)).sent;
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

  const events: ReminderEvent[] = [];

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
    totalSent += await sendReminder(supabase, event, now);
  }

  if (digestDue) {
    totalSent += await sendMemberDigests(supabase, today);
  }

  return NextResponse.json({ checked: events.length, sent: totalSent, digestDue });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
