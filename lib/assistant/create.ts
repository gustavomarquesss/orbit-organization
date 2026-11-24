import { addDaysToDate } from "@/lib/utils/brt";
import type { CardLookups } from "@/lib/queries/cards";
import type { AssistantDraft, AssistantReply } from "./types";

// Entende pedidos como "cria uma tarefa: gravar vídeo para amanhã às 14h, urgente" e
// monta um RASCUNHO de card. Nada é gravado aqui: o card só nasce quando a pessoa
// confirma no chat (que chama a server action createCard, com todas as checagens).

// Remove acentos letra a letra, mantendo os mesmos índices do texto original — assim
// dá para achar um trecho no texto "dobrado" e recortá-lo do original com acento.
function fold(text: string) {
  return text
    .split("")
    .map((c) => c.normalize("NFD")[0])
    .join("")
    .toLowerCase();
}

const NOUN = "(?:card|tarefa|atividade|lembrete|anotacao)";
const CREATE_RE = new RegExp(
  `\\b(?:cri[ae]\\w*|adiciona\\w*|cadastra\\w*|anota\\w*)\\s+(?:(?:um|uma|o|a)\\s+)?(?:nov[oa]\\s+)?${NOUN}\\b`,
);
const REMIND_RE = /\bme\s+lembr\w*\s+(?:de|que)\b/;
const UNSUPPORTED_RE = /\b(?:cri[ae]\w*|adiciona\w*|cadastra\w*|agenda\w*|marca\w*)\b.*\b(?:reuniao|reunioes|financeiro|gasto|receita|despesa)\b/;
const QUESTION_RE = /^\s*(?:como|onde|qual|quais|posso|da pra|e possivel|tem como|consigo|voce consegue|voce pode)\b/;

export function looksLikeCreate(message: string) {
  const f = fold(message);
  if (QUESTION_RE.test(f)) return false;
  return CREATE_RE.test(f) || REMIND_RE.test(f) || UNSUPPORTED_RE.test(f);
}

export function isUnsupportedCreate(message: string) {
  const f = fold(message);
  return UNSUPPORTED_RE.test(f) && !CREATE_RE.test(f);
}

class Text {
  orig: string;
  f: string;
  constructor(orig: string) {
    this.orig = orig;
    this.f = fold(orig);
  }
  private cut(start: number, end: number) {
    this.orig = `${this.orig.slice(0, start)} ${this.orig.slice(end)}`;
    this.f = fold(this.orig);
  }
  // Acha o padrão (no texto sem acento) e recorta esse trecho do texto.
  take(re: RegExp): RegExpExecArray | null {
    const m = re.exec(this.f);
    if (!m) return null;
    this.cut(m.index, m.index + m[0].length);
    return m;
  }
  // Recorta tudo até o fim do padrão (inclusive o que vem antes dele).
  takeThrough(re: RegExp): RegExpExecArray | null {
    const m = re.exec(this.f);
    if (!m) return null;
    this.cut(0, m.index + m[0].length);
    return m;
  }
}

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

function isRealDate(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const DATE_PREFIX = "(?:\\b(?:para|pra|ate|no|na|em|do|da|de|dia)\\s+)?";

function extractDate(t: Text, today: string): string | null {
  const [ty, tm, td] = today.split("-").map(Number);
  if (t.take(new RegExp(`${DATE_PREFIX}\\bdepois\\s+de\\s+amanha\\b`))) return addDaysToDate(today, 2);
  if (t.take(new RegExp(`${DATE_PREFIX}\\bamanha\\b`))) return addDaysToDate(today, 1);
  if (t.take(new RegExp(`${DATE_PREFIX}\\bhoje\\b`))) return today;
  if (t.take(new RegExp(`${DATE_PREFIX}\\b(?:semana\\s+que\\s+vem|proxima\\s+semana)\\b`))) return addDaysToDate(today, 7);

  const daysAhead = /\bdaqui\s+a\s+(\d{1,3})\s+dias?\b/.exec(t.f);
  if (daysAhead) {
    t.take(/\bdaqui\s+a\s+\d{1,3}\s+dias?\b/);
    return addDaysToDate(today, Number(daysAhead[1]));
  }

  const dm = new RegExp(`${DATE_PREFIX}\\b(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?\\b`).exec(t.f);
  if (dm) {
    const d = Number(dm[1]);
    const mo = Number(dm[2]);
    let y = dm[3] ? Number(dm[3]) : ty;
    if (y < 100) y += 2000;
    if (isRealDate(y, mo, d)) {
      let date = iso(y, mo, d);
      if (!dm[3] && date < today) date = iso(y + 1, mo, d);
      t.take(new RegExp(`${DATE_PREFIX}\\b\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?\\b`));
      return date;
    }
  }

  const dia = /\bdia\s+(\d{1,2})\b(?!\s*(?:\/|:|h))/.exec(t.f);
  if (dia) {
    const d = Number(dia[1]);
    let y = ty;
    let mo = tm;
    if (d < td) {
      mo += 1;
      if (mo > 12) {
        mo = 1;
        y += 1;
      }
    }
    if (isRealDate(y, mo, d)) {
      t.take(new RegExp(`${DATE_PREFIX.replace("|dia", "")}\\bdia\\s+\\d{1,2}\\b`));
      return iso(y, mo, d);
    }
  }

  const wd = new RegExp(
    `${DATE_PREFIX}\\b(?:proxima\\s+|essa\\s+|esta\\s+)?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\\b`,
  ).exec(t.f);
  if (wd) {
    t.take(
      new RegExp(
        `${DATE_PREFIX}\\b(?:proxima\\s+|essa\\s+|esta\\s+)?(?:domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\\b`,
      ),
    );
    const todayDow = new Date(`${today}T12:00:00Z`).getUTCDay();
    let diff = (WEEKDAYS[wd[1]] - todayDow + 7) % 7;
    if (diff === 0) diff = 7;
    return addDaysToDate(today, diff);
  }
  return null;
}

function extractTime(t: Text): string | null {
  const m = /(?:\b(?:as|ate as|por volta das)\s+)?\b(\d{1,2})(?:h|:)(\d{2})?\b/.exec(t.f);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  t.take(/(?:\b(?:as|ate as|por volta das)\s+)?\b\d{1,2}(?:h|:)(?:\d{2})?\b/);
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

type Lookup = { id: string; key: string; label: string };

function findByWord<T extends Lookup>(items: T[], word: string): T | undefined {
  const w = fold(word);
  return items.find((i) => fold(i.key) === w || fold(i.label) === w);
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export type CreateParseInput = {
  message: string;
  today: string;
  userId: string;
  userName: string | null;
  lookups: CardLookups;
};

export function parseCreateRequest({ message, today, userId, userName, lookups }: CreateParseInput): AssistantReply {
  const types = lookups.cardTypes.filter((c) => c.key !== "reuniao" && c.key !== "financeiro");
  const t = new Text(message.trim());

  // 1) título entre aspas tem prioridade: o que está dentro não é interpretado.
  let quoted: string | null = null;
  const q = /["“«]([^"”»]{2,200})["”»]/.exec(t.orig);
  if (q) {
    quoted = q[1].trim();
    t.orig = `${t.orig.slice(0, q.index)} ${t.orig.slice(q.index + q[0].length)}`;
    t.f = fold(t.orig);
  }

  // 2) tira o comando ("cria uma tarefa", "me lembra de"...) e descobre o substantivo.
  let noun = "";
  const cmd = t.takeThrough(CREATE_RE);
  if (cmd) {
    noun = cmd[0].split(/\s+/).pop() ?? "";
  } else if (t.takeThrough(/\bme\s+lembr\w*\s+(?:de|que)\b/)) {
    noun = "lembrete";
  }
  t.take(/^\s*(?:chamad[oa]|com\s+(?:o\s+)?titulo|titulo|sobre)\b/);
  t.take(/^[\s:\-–—]+/);

  // 3) tipo explícito ("do tipo vídeo").
  let type = undefined as (typeof types)[number] | undefined;
  const typeMatch = t.take(/\b(?:do\s+)?tipo\s+(\w+)/);
  if (typeMatch) type = findByWord(types, typeMatch[1]);

  // 4) prioridade.
  let priorityId: string | null = null;
  const pm = t.take(/\b(?:com\s+)?prioridade\s+(\w+)/);
  if (pm) priorityId = findByWord(lookups.priorities, pm[1])?.id ?? null;
  if (!priorityId) {
    const um = t.take(/\b(?:e\s+)?(urgentissim[oa]|urgente)\b/);
    if (um) priorityId = lookups.priorities.find((p) => p.key === "urgente")?.id ?? null;
  }
  priorityId ??= lookups.priorities.find((p) => p.key === "media")?.id ?? lookups.priorities[0]?.id ?? null;

  // 5) responsável ("para a Maria"); sem isso, quem pediu.
  let responsavelId: string | null = userId;
  let responsavelName: string | null = userName;
  for (const member of lookups.teamMembers) {
    const first = fold(member.full_name.trim().split(/\s+/)[0] ?? "");
    if (first.length < 3) continue;
    const re = new RegExp(`\\b(?:para|pra|ao|a|responsavel|atribu\\w+\\s+(?:a|ao|para))\\s+(?:a\\s+|o\\s+)?${first}\\b`);
    if (t.take(re)) {
      responsavelId = member.id;
      responsavelName = member.full_name;
      break;
    }
  }

  // 6) hora e data.
  const prazoHora = extractTime(t);
  const prazoData = extractDate(t, today) ?? (prazoHora ? today : null);

  // 7) título: o que sobrou (ou o que veio entre aspas), sem conectivos soltos nas pontas.
  let title = quoted ?? t.orig;
  title = title
    .replace(/\s+/g, " ")
    .replace(/^[\s,:;.\-–—]+|[\s,:;.\-–—]+$/g, "")
    .replace(/^(?:de|que|para|pra|sobre|chamad[oa])\s+/i, "")
    .trim();
  for (let i = 0; i < 4; i++) {
    title = title
      .replace(/\s+(?:para|pra|ate|no|na|em|de|com|e|as|às|a|o|os)$/i, "")
      .replace(/[\s,:;.\-–—]+$/g, "")
      .trim();
  }
  title = capitalize(title).slice(0, 200);

  if (title.length < 2) {
    return {
      reply:
        "Claro! Qual é o título do card? Escreva tudo de uma vez, por exemplo:\n“Crie uma tarefa: gravar vídeo da Dra. Angela para amanhã às 14h, urgente”.",
      cards: [],
    };
  }

  // 8) tipo inferido pelo conteúdo ("gravar vídeo" -> Vídeo) ou pelo substantivo.
  if (!type && noun === "anotacao") type = types.find((c) => c.key === "anotacao");
  if (!type) {
    const ft = fold(title);
    type = types.find((c) => new RegExp(`\\b${fold(c.key)}s?\\b`).test(ft) || new RegExp(`\\b${fold(c.label)}s?\\b`).test(ft));
  }
  type ??= types.find((c) => c.key === "anotacao") ?? types[0];

  const status = lookups.statuses.find((s) => s.key === "a_fazer") ?? lookups.statuses[0];

  if (!type || !status || !priorityId) {
    return { reply: "Não consegui montar o card: faltam tipos, status ou prioridades configurados.", cards: [] };
  }

  const draft: AssistantDraft = {
    title,
    cardTypeId: type.id,
    statusId: status.id,
    priorityId,
    prazoData,
    prazoHora,
    responsavelId,
    responsavelName,
    options: {
      types: types.map((c) => ({ id: c.id, label: `${c.emoji} ${c.label}`.trim() })),
      priorities: lookups.priorities.map((p) => ({ id: p.id, label: p.label })),
    },
  };

  return {
    reply: "Montei o card abaixo. Confira (dá para ajustar) e clique em Criar card:",
    cards: [],
    draft,
  };
}
