"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, SendHorizontal, Sparkles, X } from "lucide-react";

import { createCard } from "@/lib/actions/cards";
import { cn } from "@/lib/utils";
import type { AssistantCardRef, AssistantDraft, AssistantReply } from "@/lib/assistant/types";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  cards?: AssistantCardRef[];
  suggestions?: string[];
  draft?: AssistantDraft;
};

const FIELD =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

// Rascunho de card montado pelo assistente: dá para ajustar e só vira card ao confirmar.
function DraftForm({ draft }: { draft: AssistantDraft }) {
  const router = useRouter();
  const [v, setV] = useState(draft);
  const [state, setState] = useState<"editing" | "saving" | "created" | "cancelled">("editing");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setState("saving");
    setError(null);
    const res = await createCard({
      title: v.title,
      card_type_id: v.cardTypeId,
      modelo_ids: [],
      status_id: v.statusId,
      priority_id: v.priorityId,
      responsavel_ids: v.responsavelId ? [v.responsavelId] : [],
      tag_ids: [],
      prazo_data: v.prazoData ?? "",
      prazo_hora: v.prazoData ? (v.prazoHora ?? "") : "",
      recorrencia: "",
    }).catch((): { error?: string; id?: string } => ({ error: "Não foi possível criar o card agora." }));
    if (res.error || !res.id) {
      setError(res.error ?? "Não foi possível criar o card.");
      setState("editing");
      return;
    }
    setCreatedId(res.id);
    setState("created");
    router.refresh();
  }

  if (state === "cancelled") return <p className="text-xs text-muted-foreground">Rascunho descartado.</p>;
  if (state === "created" && createdId) {
    return (
      <Link
        href={`/cards/${createdId}`}
        className="flex w-full max-w-[96%] items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm"
      >
        <Check className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">Card criado: <strong>{v.title}</strong></span>
        <span className="shrink-0 text-xs text-muted-foreground">abrir</span>
      </Link>
    );
  }

  const busy = state === "saving";
  return (
    <div className="w-full max-w-[96%] space-y-2 rounded-xl border border-border bg-card p-3">
      <input
        value={v.title}
        onChange={(e) => setV({ ...v, title: e.target.value })}
        maxLength={200}
        aria-label="Título do card"
        className={cn(FIELD, "font-medium")}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={v.cardTypeId}
          onChange={(e) => setV({ ...v, cardTypeId: e.target.value })}
          aria-label="Tipo"
          className={FIELD}
        >
          {v.options.types.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <select
          value={v.priorityId}
          onChange={(e) => setV({ ...v, priorityId: e.target.value })}
          aria-label="Prioridade"
          className={FIELD}
        >
          {v.options.priorities.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={v.prazoData ?? ""}
          onChange={(e) => setV({ ...v, prazoData: e.target.value || null })}
          aria-label="Prazo"
          className={FIELD}
        />
        <input
          type="time"
          value={v.prazoHora?.slice(0, 5) ?? ""}
          disabled={!v.prazoData}
          onChange={(e) => setV({ ...v, prazoHora: e.target.value || null })}
          aria-label="Hora"
          className={cn(FIELD, "disabled:opacity-50")}
        />
      </div>
      {v.responsavelName && <p className="text-xs text-muted-foreground">Responsável: {v.responsavelName}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={busy || v.title.trim().length < 1}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Criar card
        </button>
        <button
          type="button"
          onClick={() => setState("cancelled")}
          disabled={busy}
          className="h-9 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "O que eu preciso fazer hoje?",
  "Tem alguma tarefa urgente?",
  "Qual a ordem de prioridade das minhas atividades?",
  "Crie uma tarefa: gravar vídeo para amanhã às 14h, urgente",
  "O que eu posso perguntar?",
];

const WELCOME: Message = {
  id: 0,
  role: "assistant",
  text: "Oi! Eu sou o assistente do Orbit. Pergunte o que fazer hoje, o que é urgente ou em que ordem atacar suas tarefas, sem precisar abrir os cards.",
};

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || loading) return;

      const userMessage: Message = { id: nextId.current++, role: "user", text };
      // Histórico enviado ao servidor (só usado pela IA opcional): sem o boas-vindas.
      const history = [...messages, userMessage]
        .filter((m) => m.id !== WELCOME.id)
        .slice(-7, -1)
        .map((m) => ({ role: m.role, content: m.text }));

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      let answer: Message;
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: text, history }),
        });
        const data = (await res.json().catch(() => null)) as (Partial<AssistantReply> & { error?: string }) | null;
        if (!res.ok || !data || typeof data.reply !== "string") {
          answer = {
            id: nextId.current++,
            role: "assistant",
            text: data?.error ?? "Não consegui responder agora. Tente de novo em instantes.",
          };
        } else {
          answer = { id: nextId.current++, role: "assistant", text: data.reply, cards: data.cards ?? [],
            draft: data.draft,
            suggestions: data.suggestions,
          };
        }
      } catch {
        answer = {
          id: nextId.current++,
          role: "assistant",
          text: "Sem conexão com o servidor. Verifique a internet e tente novamente.",
        };
      }

      setMessages((prev) => [...prev, answer]);
      setLoading(false);
    },
    [loading, messages],
  );

  // Botões de perguntas prontas: os da última resposta (ajuda) ou, no começo, os iniciais.
  const last = messages[messages.length - 1];
  const chips = loading ? [] : (last.suggestions ?? (messages.length === 1 ? SUGGESTIONS : []));

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="Assistente do Orbit"
          className="fixed right-4 bottom-36 z-50 flex h-[min(34rem,calc(100dvh-11rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 animate-in fade-in-0 slide-in-from-bottom-4 duration-150 sm:w-96 md:right-6 md:bottom-24 md:h-[min(34rem,calc(100dvh-8rem))]"
        >
          <header className="flex items-center gap-2.5 border-b border-border bg-primary/10 px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight font-semibold">Assistente Orbit</p>
              <p className="text-xs text-muted-foreground">Pergunte sobre suas tarefas</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar assistente"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.text}
                </div>
                {m.draft && <DraftForm draft={m.draft} />}
                {m.cards && m.cards.length > 0 && (
                  <ol className="w-full max-w-[96%] space-y-1.5">
                    {m.cards.map((card) => (
                      <li key={card.id}>
                        <Link
                          href={`/cards/${card.id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:border-primary/50 hover:bg-accent"
                        >
                          <span
                            aria-hidden
                            className="mt-1.5 size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: card.priorityColor ?? "var(--muted-foreground)" }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{card.title}</span>
                            {card.note && <span className="block text-xs text-muted-foreground">{card.note}</span>}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">#{card.number}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Pensando…
              </div>
            )}

            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {chips.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-primary/15"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Pergunte algo…"
              aria-label="Mensagem para o assistente"
              className="h-10 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            >
              <SendHorizontal className="size-4" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar assistente" : "Abrir assistente"}
        aria-expanded={open}
        className="fixed right-4 bottom-20 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20 transition-transform hover:scale-105 active:scale-95 md:right-6 md:bottom-6"
      >
        {open ? <X className="size-6" /> : <Sparkles className="size-6" />}
      </button>
    </>
  );
}
