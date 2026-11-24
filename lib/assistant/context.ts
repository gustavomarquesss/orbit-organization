import { canViewCardOfType } from "@/lib/auth/permissions";
import { getAccess } from "@/lib/auth/session";
import { getCardListExtras } from "@/lib/queries/card-extras";
import { createClient } from "@/lib/supabase/server";
import { todayBRT } from "@/lib/utils/brt";
import type { AssistantContext, AssistantTask } from "./types";

const CARD_SELECT = `
  id, card_number, title, prazo_data, prazo_hora,
  card_type:card_types!cards_card_type_id_fkey(key, label),
  status:statuses!cards_status_id_fkey(key, label),
  priority:priorities!cards_priority_id_fkey(key, label, color, sort_order),
  card_responsaveis(team_member_id, team_member:team_members(full_name)),
  meeting_details(meeting_date, meeting_time)
`;

type MeetingRow = { meeting_date: string; meeting_time: string | null };

type CardRow = {
  id: string;
  card_number: number;
  title: string;
  prazo_data: string | null;
  prazo_hora: string | null;
  card_type: { key: string; label: string } | null;
  status: { key: string; label: string } | null;
  priority: { key: string; label: string; color: string; sort_order: number } | null;
  card_responsaveis: { team_member_id: string; team_member: { full_name: string } | null }[];
  // Relação 1:1, mas o PostgREST pode devolver objeto ou lista dependendo do schema.
  meeting_details: MeetingRow | MeetingRow[] | null;
};

// Monta o retrato das tarefas em aberto da pessoa logada. Usa o cliente com a sessão
// dela (RLS) e ainda respeita as permissões do painel admin: quem não pode ver cards
// não recebe cards no assistente.
export async function loadAssistantContext(): Promise<AssistantContext | null> {
  const access = await getAccess();
  if (!access) return null;

  const supabase = await createClient();
  const [{ data: excluded }, { data: member }, extras] = await Promise.all([
    supabase.from("statuses").select("id").in("key", ["concluido", "arquivado"]),
    supabase.from("team_members").select("full_name").eq("id", access.userId).maybeSingle(),
    getCardListExtras(),
  ]);

  let query = supabase.from("cards").select(CARD_SELECT).order("updated_at", { ascending: false }).limit(400);
  const excludedIds = (excluded ?? []).map((s) => s.id);
  if (excludedIds.length > 0) query = query.not("status_id", "in", `(${excludedIds.join(",")})`);

  const { data, error } = await query;
  if (error) throw error;

  const tasks: AssistantTask[] = [];
  for (const row of (data ?? []) as unknown as CardRow[]) {
    const typeKey = row.card_type?.key ?? "";
    // Financeiro tem aba própria e nunca entra na lista de tarefas.
    if (typeKey === "financeiro") continue;
    if (!canViewCardOfType(access, typeKey)) continue;

    const meeting = Array.isArray(row.meeting_details) ? row.meeting_details[0] : row.meeting_details;
    const isMeeting = typeKey === "reuniao" && !!meeting;

    tasks.push({
      id: row.id,
      number: row.card_number,
      title: row.title,
      typeKey,
      typeLabel: row.card_type?.label ?? "Card",
      statusKey: row.status?.key ?? "",
      statusLabel: row.status?.label ?? "",
      priorityKey: row.priority?.key ?? null,
      priorityLabel: row.priority?.label ?? null,
      priorityColor: row.priority?.color ?? null,
      priorityRank: row.priority?.sort_order ?? 0,
      dueDate: isMeeting ? meeting!.meeting_date : row.prazo_data,
      dueTime: isMeeting ? meeting!.meeting_time : row.prazo_hora,
      isMeeting,
      checklist: extras.get(row.id)?.checklist ?? null,
      mine: row.card_responsaveis.some((r) => r.team_member_id === access.userId),
      responsaveis: row.card_responsaveis.map((r) => r.team_member?.full_name).filter((n): n is string => !!n),
    });
  }

  return {
    today: todayBRT(),
    userFirstName: member?.full_name?.trim().split(/\s+/)[0] ?? null,
    tasks,
  };
}
