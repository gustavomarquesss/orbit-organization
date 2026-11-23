import { can } from "@/lib/auth/permissions";
import { getAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addDaysToDate, todayBRT } from "@/lib/utils/brt";
import { isItemDone, type ChecklistItemData } from "@/lib/utils/checklist";

export type { ChecklistItemData };

export type ChecklistDay = { date: string; done: number; total: number };

export type ChecklistData = {
  id: string;
  title: string;
  repeat_daily: boolean;
  sort_order: number;
  items: ChecklistItemData[];
  // Só para checklists que repetem todo dia.
  streak: number;
  yesterday: ChecklistDay | null;
  last7: ChecklistDay[];
};

export type CommentData = {
  id: string;
  body: string;
  created_at: string;
  author: { id: string; full_name: string; avatar_color: string; avatar_url: string | null } | null;
};

export type LinkData = { id: string; title: string | null; url: string; created_at: string };

export type CardExtras = {
  // false quando a migration 0017 ainda não foi aplicada no banco.
  available: boolean;
  today: string;
  checklists: ChecklistData[];
  comments: CommentData[];
  links: LinkData[];
};

type LogRow = { checklist_id: string; log_date: string; done_count: number; total_count: number };

function buildDailyStats(logs: LogRow[], today: string, doneToday: number, totalToday: number) {
  const byDate = new Map(logs.map((row) => [row.log_date, row]));
  // O dia de hoje vem sempre do estado atual dos itens, não do log (que pode estar defasado).
  byDate.set(today, { checklist_id: "", log_date: today, done_count: doneToday, total_count: totalToday });

  const complete = (date: string) => {
    const row = byDate.get(date);
    return Boolean(row && row.total_count > 0 && row.done_count >= row.total_count);
  };

  let streak = 0;
  let cursor = complete(today) ? today : addDaysToDate(today, -1);
  while (complete(cursor) && streak < 365) {
    streak += 1;
    cursor = addDaysToDate(cursor, -1);
  }

  const last7: ChecklistDay[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = addDaysToDate(today, -offset);
    const row = byDate.get(date);
    last7.push({ date, done: row?.done_count ?? 0, total: row?.total_count ?? 0 });
  }

  const yesterdayRow = byDate.get(addDaysToDate(today, -1));
  const yesterday = yesterdayRow
    ? { date: yesterdayRow.log_date, done: yesterdayRow.done_count, total: yesterdayRow.total_count }
    : null;

  return { streak, yesterday, last7 };
}

export async function getCardExtras(cardId: string): Promise<CardExtras> {
  const supabase = await createClient();
  const today = todayBRT();

  const [lists, comments, links] = await Promise.all([
    supabase
      .from("card_checklists")
      .select("id, title, repeat_daily, sort_order, card_checklist_items(id, text, done, done_on, sort_order)")
      .eq("card_id", cardId)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("card_comments")
      .select("id, body, created_at, author:team_members!card_comments_author_id_fkey(id, full_name, avatar_color, avatar_url)")
      .eq("card_id", cardId)
      .order("created_at"),
    supabase.from("card_links").select("id, title, url, created_at").eq("card_id", cardId).order("created_at"),
  ]);

  if (lists.error || comments.error || links.error) {
    return { available: false, today, checklists: [], comments: [], links: [] };
  }

  const dailyIds = (lists.data ?? []).filter((l) => l.repeat_daily).map((l) => l.id);
  let logs: LogRow[] = [];
  if (dailyIds.length > 0) {
    const since = addDaysToDate(today, -60);
    const { data } = await supabase
      .from("checklist_daily_log")
      .select("checklist_id, log_date, done_count, total_count")
      .in("checklist_id", dailyIds)
      .gte("log_date", since);
    logs = data ?? [];
  }

  const checklists: ChecklistData[] = (lists.data ?? []).map((list) => {
    const items = [...(list.card_checklist_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const stats = list.repeat_daily
      ? buildDailyStats(
          logs.filter((row) => row.checklist_id === list.id),
          today,
          items.filter((item) => isItemDone(item, true, today)).length,
          items.length,
        )
      : { streak: 0, yesterday: null, last7: [] };
    return {
      id: list.id,
      title: list.title,
      repeat_daily: list.repeat_daily,
      sort_order: list.sort_order,
      items,
      ...stats,
    };
  });

  return {
    available: true,
    today,
    checklists,
    comments: (comments.data ?? []) as unknown as CommentData[],
    links: links.data ?? [],
  };
}

export type CardListExtra = {
  cover_color: string | null;
  board_position: number | null;
  checklist: { done: number; total: number; daily: boolean } | null;
};

// Resumo leve para os cards do quadro/lista: capa, ordem manual e progresso dos checklists.
// Nunca lança erro, para a página de Cards continuar funcionando mesmo antes das migrations
// 0017/0018 serem aplicadas (cada consulta falha sozinha e só some aquele extra).
export async function getCardListExtras(): Promise<Map<string, CardListExtra>> {
  const map = new Map<string, CardListExtra>();
  const entry = (id: string): CardListExtra => {
    let current = map.get(id);
    if (!current) {
      current = { cover_color: null, board_position: null, checklist: null };
      map.set(id, current);
    }
    return current;
  };

  try {
    const supabase = await createClient();
    const today = todayBRT();

    const [covers, positions, lists] = await Promise.all([
      supabase.from("cards").select("id, cover_color").not("cover_color", "is", null),
      supabase.from("cards").select("id, board_position").not("board_position", "is", null),
      supabase.from("card_checklists").select("card_id, repeat_daily, card_checklist_items(done, done_on)"),
    ]);

    if (!covers.error) {
      for (const row of covers.data ?? []) entry(row.id).cover_color = row.cover_color;
    }
    if (!positions.error) {
      for (const row of positions.data ?? []) entry(row.id).board_position = row.board_position;
    }
    if (!lists.error) {
      for (const list of lists.data ?? []) {
        const items = list.card_checklist_items ?? [];
        if (items.length === 0) continue;
        const done = items.filter((item) => isItemDone(item, list.repeat_daily, today)).length;
        const current = entry(list.card_id);
        current.checklist = {
          done: (current.checklist?.done ?? 0) + done,
          total: (current.checklist?.total ?? 0) + items.length,
          daily: (current.checklist?.daily ?? false) || list.repeat_daily,
        };
      }
    }
  } catch {
    // sem extras: o card aparece normalmente, só sem capa/ordem/progresso
  }
  return map;
}

export type CardViewer = {
  userId: string;
  isAdmin: boolean;
  canEdit: boolean;
  member: { full_name: string; avatar_color: string; avatar_url: string | null } | null;
};

// Quem está vendo o card: define o que pode editar e como o comentário novo aparece.
export async function getCardViewer(): Promise<CardViewer | null> {
  const access = await getAccess();
  if (!access) return null;
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("full_name, avatar_color, avatar_url")
    .eq("id", access.userId)
    .maybeSingle();
  return { userId: access.userId, isAdmin: access.isAdmin, canEdit: can(access, "cards_edit"), member };
}
