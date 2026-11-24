import { NextResponse } from "next/server";

import { answerLocally, fallbackReply } from "@/lib/assistant/answer";
import { loadAssistantContext } from "@/lib/assistant/context";
import { isUnsupportedCreate, looksLikeCreate, parseCreateRequest } from "@/lib/assistant/create";
import { askLlm, isLlmEnabled } from "@/lib/assistant/llm";
import { can } from "@/lib/auth/permissions";
import { getAccess } from "@/lib/auth/session";
import { getCardLookups } from "@/lib/queries/cards";
import type { AssistantChatMessage, AssistantReply } from "@/lib/assistant/types";

export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY = 6;

function parseHistory(raw: unknown): AssistantChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const clean: AssistantChatMessage[] = [];
  for (const item of raw.slice(-MAX_HISTORY)) {
    if (!item || typeof item !== "object") continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
      clean.push({ role, content: content.slice(0, 1500) });
    }
  }
  // A API exige que a conversa comece por uma mensagem do usuário.
  while (clean.length > 0 && clean[0].role !== "user") clean.shift();
  return clean;
}

export async function POST(request: Request) {
  let body: { message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Escreva uma pergunta." }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Pergunta longa demais (máx. ${MAX_MESSAGE_LENGTH} caracteres).` }, { status: 400 });
  }

  const ctx = await loadAssistantContext();
  if (!ctx) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });

  // Pedido para criar card: devolve um rascunho para confirmar (nada é gravado aqui).
  if (looksLikeCreate(message)) {
    if (isUnsupportedCreate(message)) {
      return NextResponse.json<AssistantReply>({
        reply:
          "Reuniões e lançamentos financeiros têm formulário próprio (datas, participantes, valores). Crie pela aba Reuniões ou Financeiro; já para tarefas e anotações eu monto o card aqui no chat.",
        cards: [],
      });
    }
    const access = await getAccess();
    if (!access || !can(access, "cards_edit")) {
      return NextResponse.json<AssistantReply>({
        reply: "Você não tem permissão para criar cards. Peça a um administrador para liberar.",
        cards: [],
      });
    }
    const lookups = await getCardLookups();
    return NextResponse.json(
      parseCreateRequest({
        message,
        today: ctx.today,
        userId: access.userId,
        userName: ctx.userFirstName,
        lookups,
      }),
    );
  }

  let result: AssistantReply | null = answerLocally(message, ctx);

  if (!result && isLlmEnabled()) {
    const text = await askLlm(message, parseHistory(body.history), ctx);
    if (text) result = { reply: text, cards: [] };
  }

  return NextResponse.json(result ?? fallbackReply(message, ctx));
}
