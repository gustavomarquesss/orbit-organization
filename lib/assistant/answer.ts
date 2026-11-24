import { addDaysToDate } from "@/lib/utils/brt";
import type { AssistantCardRef, AssistantContext, AssistantReply, AssistantTask } from "./types";

// Motor de respostas local: entende as perguntas mais comuns sobre o dia e responde
// direto dos cards, sem custo e sem depender de serviço externo. `answerLocally`
// devolve null quando não reconhece a pergunta (aí entra o modelo de IA, se houver).

const MAX_LIST = 8;

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function daysBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function shortDate(date: string) {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

function weekday(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(".", "");
}

function timeSuffix(task: AssistantTask) {
  return task.dueTime ? ` às ${task.dueTime.slice(0, 5)}` : "";
}

// Dias até o prazo (negativo = atrasado). null quando não há data.
function daysUntil(task: AssistantTask, today: string) {
  return task.dueDate ? daysBetween(today, task.dueDate) : null;
}

// Reunião que já passou não é "atraso": simplesmente aconteceu.
function isOverdue(task: AssistantTask, today: string) {
  const d = daysUntil(task, today);
  return d !== null && d < 0 && !task.isMeeting;
}

function isDueToday(task: AssistantTask, today: string) {
  return daysUntil(task, today) === 0;
}

function hasPendingDailyChecklist(task: AssistantTask) {
  return !!task.checklist?.daily && task.checklist.done < task.checklist.total;
}

function isUrgent(task: AssistantTask) {
  return task.priorityKey === "urgente";
}

function dueLabel(task: AssistantTask, today: string): string | null {
  const d = daysUntil(task, today);
  if (d === null) return null;
  const prefix = task.isMeeting ? "Reunião " : "";
  if (d < 0) return `Atrasado há ${plural(-d, "dia", "dias")}`;
  if (d === 0) return `${prefix || "Vence "}hoje${timeSuffix(task)}`;
  if (d === 1) return `${prefix || "Vence "}amanhã${timeSuffix(task)}`;
  return `${prefix || "Vence "}${weekday(task.dueDate!)} ${shortDate(task.dueDate!)}${timeSuffix(task)}`;
}

// Quanto maior, mais cedo deve ser feito: atrasado > vence hoje > prioridade > andamento.
function score(task: AssistantTask, today: string) {
  let s = task.priorityRank * 100;
  if (isUrgent(task)) s += 300;
  const d = daysUntil(task, today);
  if (d !== null) {
    if (d < 0 && !task.isMeeting) s += 1000 + Math.min(-d, 30) * 5;
    else if (d === 0) s += 800;
    else if (d === 1) s += 500;
    else if (d > 1 && d <= 7) s += 300 - d * 10;
  }
  if (hasPendingDailyChecklist(task)) s += 150;
  if (task.statusKey === "em_andamento") s += 50;
  // Aguardando = depende de outra pessoa, então não é o que fazer primeiro.
  if (task.statusKey === "aguardando") s -= 150;
  return s;
}

function byScore(today: string) {
  return (a: AssistantTask, b: AssistantTask) => score(b, today) - score(a, today);
}

// Por que este card está na lista (uma frase curta mostrada embaixo do título).
function noteFor(task: AssistantTask, today: string): string {
  const parts: string[] = [];
  const due = dueLabel(task, today);
  if (due) parts.push(due);
  if (isUrgent(task) || task.priorityRank >= 3) {
    if (task.priorityLabel) parts.push(`Prioridade ${task.priorityLabel.toLowerCase()}`);
  }
  if (task.checklist && task.checklist.total > 0) {
    parts.push(`${task.checklist.daily ? "Checklist de hoje" : "Checklist"} ${task.checklist.done}/${task.checklist.total}`);
  }
  if (parts.length === 0 && task.statusLabel) parts.push(task.statusLabel);
  return parts.join(" · ");
}

function toRefs(tasks: AssistantTask[], today: string): AssistantCardRef[] {
  return tasks.slice(0, MAX_LIST).map((t) => ({
    id: t.id,
    number: t.number,
    title: t.title,
    priorityLabel: t.priorityLabel,
    priorityColor: t.priorityColor,
    note: noteFor(t, today),
  }));
}

function moreNote(total: number) {
  return total > MAX_LIST ? ` Mostrando as ${MAX_LIST} primeiras.` : "";
}

function greetingName(ctx: AssistantContext) {
  return ctx.userFirstName ? `, ${ctx.userFirstName}` : "";
}

type Scope = { tasks: AssistantTask[]; label: string; fallbackNote: string };

function pickScope(ctx: AssistantContext, wantsTeam: boolean): Scope {
  if (wantsTeam) return { tasks: ctx.tasks, label: "da equipe", fallbackNote: "" };
  const mine = ctx.tasks.filter((t) => t.mine);
  // Quem ainda não tem nenhum card atribuído enxerga a equipe toda, avisando disso.
  if (mine.length === 0 && ctx.tasks.length > 0) {
    return {
      tasks: ctx.tasks,
      label: "da equipe",
      fallbackNote: "Nenhum card está atribuído a você, então estou olhando os da equipe toda. ",
    };
  }
  return { tasks: mine, label: "seus", fallbackNote: "" };
}

function reply(text: string, tasks: AssistantTask[] = [], today = ""): AssistantReply {
  return { reply: text, cards: toRefs(tasks, today) };
}

// Todas as perguntas que o assistente entende. Aparecem como botões clicáveis na ajuda.
export const ALL_QUESTIONS = [
  "O que eu preciso fazer hoje?",
  "Tem alguma tarefa urgente?",
  "Qual a ordem de prioridade das minhas atividades?",
  "O que está atrasado?",
  "Quais reuniões eu tenho?",
  "O que vence amanhã?",
  "O que vence essa semana?",
  "Tem algum checklist diário em aberto?",
  "Me dá um resumo das minhas tarefas",
  "O que está atrasado na equipe?",
  "Tem alguma tarefa urgente na equipe?",
  "Crie uma tarefa: gravar vídeo para amanhã às 14h, urgente",
  "Me lembra de ligar para o cliente hoje às 16h",
];

function helpReply(intro?: string): AssistantReply {
  return {
    reply:
      (intro ? `${intro} ` : "") +
      "Você pode perguntar sobre suas tarefas sem abrir os cards, ou pedir para eu criar uma. Toque em uma pergunta para fazê-la (diga “da equipe” para olhar os cards de todo mundo):",
    cards: [],
    suggestions: ALL_QUESTIONS,
  };
}

// ---------------------------------------------------------------------------
// Respostas por assunto

function answerToday(ctx: AssistantContext, scope: Scope): AssistantReply {
  const { today } = ctx;
  const open = scope.tasks;
  const overdue = open.filter((t) => isOverdue(t, today));
  const dueToday = open.filter((t) => isDueToday(t, today) && !t.isMeeting);
  const meetings = open.filter((t) => t.isMeeting && isDueToday(t, today));
  const checklists = open.filter(hasPendingDailyChecklist);
  const urgent = open.filter(isUrgent);

  const picked = new Map<string, AssistantTask>();
  for (const t of [...overdue, ...dueToday, ...meetings, ...checklists, ...urgent]) picked.set(t.id, t);
  const list = [...picked.values()].sort(byScore(today));

  if (list.length === 0) {
    const next = open
      .filter((t) => !t.isMeeting && t.statusKey !== "aguardando")
      .sort(byScore(today))
      .slice(0, 3);
    if (next.length === 0) {
      return reply(`${scope.fallbackNote}Nada pendente para hoje${greetingName(ctx)}. Dia livre! 🎉`);
    }
    return reply(
      `${scope.fallbackNote}Nada com prazo para hoje${greetingName(ctx)}. Se quiser adiantar trabalho, estes são os próximos da fila:`,
      next,
      today,
    );
  }

  const bits: string[] = [];
  if (overdue.length) bits.push(`${plural(overdue.length, "atrasado", "atrasados")}`);
  if (dueToday.length) bits.push(`${dueToday.length} para entregar hoje`);
  if (meetings.length) bits.push(plural(meetings.length, "reunião", "reuniões"));
  if (checklists.length) bits.push(`${plural(checklists.length, "checklist diário", "checklists diários")} em aberto`);
  if (urgent.length && !bits.length) bits.push(plural(urgent.length, "urgente", "urgentes"));

  return reply(
    `${scope.fallbackNote}Para hoje (${shortDate(today)}) você tem ${plural(list.length, "item", "itens")}: ${bits.join(", ")}. Já na ordem em que eu faria:${moreNote(list.length)}`,
    list,
    today,
  );
}

function answerUrgent(ctx: AssistantContext, scope: Scope): AssistantReply {
  const { today } = ctx;
  const urgent = scope.tasks.filter((t) => isUrgent(t) || isOverdue(t, today)).sort(byScore(today));

  if (urgent.length === 0) {
    return reply(`${scope.fallbackNote}Nenhuma tarefa urgente ou atrasada ${scope.label === "seus" ? "com você" : "na equipe"} agora. Tudo sob controle ✅`);
  }
  const urgentCount = urgent.filter(isUrgent).length;
  const overdueCount = urgent.filter((t) => isOverdue(t, today)).length;
  const bits: string[] = [];
  if (urgentCount) bits.push(plural(urgentCount, "com prioridade urgente", "com prioridade urgente"));
  if (overdueCount) bits.push(plural(overdueCount, "atrasada", "atrasadas"));
  return reply(
    `${scope.fallbackNote}Sim! ${plural(urgent.length, "tarefa pede", "tarefas pedem")} atenção ${scope.label === "seus" ? "" : "na equipe "}(${bits.join(" e ")}):${moreNote(urgent.length)}`,
    urgent,
    today,
  );
}

function answerRanked(ctx: AssistantContext, scope: Scope): AssistantReply {
  const { today } = ctx;
  const list = scope.tasks.filter((t) => !(t.isMeeting && (daysUntil(t, today) ?? 0) < 0)).sort(byScore(today));
  if (list.length === 0) return reply(`${scope.fallbackNote}Você não tem nenhuma atividade em aberto. 🎉`);
  return reply(
    `${scope.fallbackNote}Esta é a ordem que eu sugiro (${plural(list.length, "atividade", "atividades")} em aberto). Peso: atrasadas, depois o que vence hoje/amanhã, depois a prioridade do card; o que está aguardando outra pessoa fica por último.${moreNote(list.length)}`,
    list,
    today,
  );
}

function answerOverdue(ctx: AssistantContext, scope: Scope): AssistantReply {
  const { today } = ctx;
  const list = scope.tasks.filter((t) => isOverdue(t, today)).sort(byScore(today));
  if (list.length === 0) return reply(`${scope.fallbackNote}Nada atrasado ${scope.label === "seus" ? "com você" : "na equipe"}. 👏`);
  return reply(
    `${scope.fallbackNote}${plural(list.length, "card atrasado", "cards atrasados")}:${moreNote(list.length)}`,
    list,
    today,
  );
}

function answerMeetings(ctx: AssistantContext, scope: Scope): AssistantReply {
  const { today } = ctx;
  const list = scope.tasks
    .filter((t) => t.isMeeting && (daysUntil(t, today) ?? -1) >= 0)
    .sort((a, b) => `${a.dueDate}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate}${b.dueTime ?? ""}`));
  if (list.length === 0) return reply(`${scope.fallbackNote}Nenhuma reunião agendada pela frente.`);
  const todayCount = list.filter((t) => isDueToday(t, today)).length;
  return reply(
    `${scope.fallbackNote}${todayCount ? `${plural(todayCount, "reunião hoje", "reuniões hoje")}. ` : "Nenhuma reunião hoje. "}Próximas:${moreNote(list.length)}`,
    list,
    today,
  );
}

function answerUpcoming(ctx: AssistantContext, scope: Scope, days: number): AssistantReply {
  const { today } = ctx;
  const limit = addDaysToDate(today, days);
  const list = scope.tasks
    .filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= limit)
    .sort((a, b) => `${a.dueDate}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate}${b.dueTime ?? ""}`));
  const when = days === 1 ? "até amanhã" : "nos próximos 7 dias";
  if (list.length === 0) return reply(`${scope.fallbackNote}Nada com prazo ${when}.`);
  return reply(
    `${scope.fallbackNote}${plural(list.length, "item", "itens")} com data ${when}:${moreNote(list.length)}`,
    list,
    today,
  );
}

function answerChecklists(ctx: AssistantContext, scope: Scope): AssistantReply {
  const { today } = ctx;
  const list = scope.tasks.filter(hasPendingDailyChecklist);
  if (list.length === 0) return reply(`${scope.fallbackNote}Todos os checklists diários de hoje estão em dia. ✅`);
  return reply(
    `${scope.fallbackNote}${plural(list.length, "checklist diário ainda em aberto", "checklists diários ainda em aberto")} hoje:`,
    list,
    today,
  );
}

function answerSummary(ctx: AssistantContext, scope: Scope): AssistantReply {
  const { today } = ctx;
  const open = scope.tasks;
  const overdue = open.filter((t) => isOverdue(t, today)).length;
  const dueToday = open.filter((t) => isDueToday(t, today)).length;
  const urgent = open.filter(isUrgent).length;
  const doing = open.filter((t) => t.statusKey === "em_andamento").length;
  const waiting = open.filter((t) => t.statusKey === "aguardando").length;
  const meetings = open.filter((t) => t.isMeeting && (daysUntil(t, today) ?? -1) >= 0).length;

  const lines = [
    `${scope.fallbackNote}Resumo${greetingName(ctx)} (${scope.label === "seus" ? "seus cards" : "equipe"}): ${plural(open.length, "card em aberto", "cards em aberto")}.`,
    `• ${overdue} atrasado${overdue === 1 ? "" : "s"} · ${dueToday} para hoje · ${urgent} urgente${urgent === 1 ? "" : "s"}`,
    `• ${doing} em andamento · ${waiting} aguardando · ${plural(meetings, "reunião agendada", "reuniões agendadas")}`,
  ];
  const top = [...open].sort(byScore(today)).slice(0, 3);
  if (top.length) lines.push("Eu começaria por:");
  return reply(lines.join("\n"), top, today);
}

function greetingReply(ctx: AssistantContext): AssistantReply {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(
      new Date(),
    ),
  );
  const salute = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return {
    reply: `${salute}${greetingName(ctx)}! Sou o assistente do Orbit. Me pergunte o que fazer hoje, o que é urgente ou em que ordem atacar suas tarefas.`,
    cards: [],
  };
}

const STOPWORDS = new Set([
  "qual", "quais", "tem", "tenho", "esse", "essa", "este", "esta", "para", "pra", "com", "sem", "uma", "uns", "umas",
  "que", "quem", "onde", "como", "sobre", "minha", "minhas", "meu", "meus", "card", "cards", "tarefa", "tarefas",
  "atividade", "atividades", "mais", "muito", "algum", "alguma", "preciso", "fazer",
]);

function answerSearch(ctx: AssistantContext, text: string): AssistantReply | null {
  const words = normalize(text)
    .split(" ")
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  if (words.length === 0) return null;
  const matches = ctx.tasks
    .map((t) => {
      const haystack = normalize(`${t.title} ${t.typeLabel}`);
      return { task: t, hits: words.filter((w) => haystack.includes(w)).length };
    })
    .filter((m) => m.hits > 0)
    .sort((a, b) => b.hits - a.hits || score(b.task, ctx.today) - score(a.task, ctx.today))
    .map((m) => m.task);
  if (matches.length === 0) return null;
  return reply(`Encontrei ${plural(matches.length, "card", "cards")} que combina${matches.length === 1 ? "" : "m"} com isso:${moreNote(matches.length)}`, matches, ctx.today);
}

// ---------------------------------------------------------------------------

export function answerLocally(message: string, ctx: AssistantContext): AssistantReply | null {
  const text = normalize(message);
  if (!text) return helpReply();

  const wantsTeam = /\b(equipe|time|todos|todas|geral|empresa)\b/.test(text);
  const scope = pickScope(ctx, wantsTeam);

  if (
    /\b(ajuda|ajudar|help|comandos?|exemplos?|opcoes|sugestoes|perguntas)\b|o que (eu )?(posso|pode|da pra|consigo) (te )?(perguntar|pedir|fazer)|o que (voce|vc) (faz|sabe|pode)|como (funciona|usar)|^menu$/.test(
      text,
    )
  ) {
    return helpReply();
  }
  if (/atrasad|vencid|perdi|fora do prazo|estourad/.test(text)) return answerOverdue(ctx, scope);
  if (/reuniao|reunioes|agenda|compromisso|meeting/.test(text)) return answerMeetings(ctx, scope);
  if (/checklist|rotina/.test(text)) return answerChecklists(ctx, scope);
  if (/urgen|emergenc|critic|socorro/.test(text)) return answerUrgent(ctx, scope);
  if (/priorid|ordem|priorizar|primeiro|comecar|por onde|sequencia/.test(text)) return answerRanked(ctx, scope);
  if (/amanha/.test(text)) return answerUpcoming(ctx, scope, 1);
  if (/semana|proximos dias|proximo prazo|prazos?\b|vence|vencem|entregas?/.test(text)) return answerUpcoming(ctx, scope, 7);
  if (/\bhoje\b|\bagora\b|do dia|o que (eu )?(preciso|devo|tenho|falta)|pendente|pendencias/.test(text)) {
    return answerToday(ctx, scope);
  }
  if (/resumo|visao geral|panorama|quantas|quantos|como (estou|estao|esta)/.test(text)) return answerSummary(ctx, scope);
  if (/^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|hey|hello|fala)\b/.test(text)) return greetingReply(ctx);

  return null;
}

// Último recurso (sem IA configurada): tenta achar cards pelo texto; senão mostra a ajuda.
export function fallbackReply(message: string, ctx: AssistantContext): AssistantReply {
  return answerSearch(ctx, message) ?? helpReply("Não entendi bem essa pergunta.");
}
