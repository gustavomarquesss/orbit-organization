"use client";

import { useRef, useState, useTransition } from "react";
import { Flame, ListChecks, Loader2, Pencil, Plus, RotateCcw, Sun, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  addChecklist,
  addChecklistItems,
  deleteChecklist,
  deleteChecklistItem,
  resetChecklist,
  toggleChecklistItem,
  updateChecklist,
  updateChecklistItemText,
} from "@/lib/actions/card-extras";
import { cn } from "@/lib/utils";
import { isItemDone } from "@/lib/utils/checklist";
import type { ChecklistData, ChecklistDay } from "@/lib/queries/card-extras";

type LocalItem = { id: string; text: string; done: boolean; done_on: string | null; sort_order: number };
type LocalList = Omit<ChecklistData, "items"> & { items: LocalItem[] };

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function weekday(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function DayStrip({ days, today, doneToday, totalToday }: { days: ChecklistDay[]; today: string; doneToday: number; totalToday: number }) {
  return (
    <div className="flex items-center gap-1" aria-label="Últimos 7 dias">
      {days.map((day) => {
        const isToday = day.date === today;
        const done = isToday ? doneToday : day.done;
        const total = isToday ? totalToday : day.total;
        const full = total > 0 && done >= total;
        const partial = done > 0 && !full;
        return (
          <div key={day.date} className="flex flex-col items-center gap-0.5" title={`${day.date.split("-").reverse().join("/")}: ${done}/${total}`}>
            <span
              className={cn(
                "size-4 rounded-[5px] transition-colors",
                full ? "bg-emerald-500" : partial ? "bg-amber-500/70" : "bg-muted",
                isToday && "ring-2 ring-primary/60 ring-offset-1 ring-offset-background",
              )}
            />
            <span className="text-[9px] text-muted-foreground">{weekday(day.date)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChecklistBlock({
  list,
  today,
  canEdit,
  onChange,
  onRemove,
}: {
  list: LocalList;
  today: string;
  canEdit: boolean;
  onChange: (next: LocalList) => void;
  onRemove: () => void;
}) {
  const [, startTransition] = useTransition();
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(list.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = list.items.length;
  const done = list.items.filter((item) => isItemDone(item, list.repeat_daily, today)).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const complete = total > 0 && done === total;

  function toggle(item: LocalItem, checked: boolean) {
    const previous = list;
    onChange({
      ...list,
      items: list.items.map((i) =>
        i.id === item.id
          ? list.repeat_daily
            ? { ...i, done_on: checked ? today : null }
            : { ...i, done: checked }
          : i,
      ),
    });
    startTransition(async () => {
      const result = await toggleChecklistItem(item.id, checked);
      if (result.error) {
        toast.error(result.error);
        onChange(previous);
      }
    });
  }

  function handleAdd() {
    const text = newText.trim();
    if (!text || adding) return;
    setAdding(true);
    startTransition(async () => {
      const result = await addChecklistItems(list.id, text);
      setAdding(false);
      if (result.error || !result.items) {
        toast.error(result.error ?? "Não foi possível adicionar.");
        return;
      }
      const created = result.items.map((i) => ({ ...i, done: false, done_on: null }));
      onChange({ ...list, items: [...list.items, ...created] });
      setNewText("");
      inputRef.current?.focus();
    });
  }

  function handleDeleteItem(item: LocalItem) {
    const previous = list;
    onChange({ ...list, items: list.items.filter((i) => i.id !== item.id) });
    startTransition(async () => {
      const result = await deleteChecklistItem(item.id);
      if (result.error) {
        toast.error(result.error);
        onChange(previous);
      }
    });
  }

  function handleSaveItemText(item: LocalItem) {
    const text = editText.trim();
    setEditingItem(null);
    if (!text || text === item.text) return;
    const previous = list;
    onChange({ ...list, items: list.items.map((i) => (i.id === item.id ? { ...i, text } : i)) });
    startTransition(async () => {
      const result = await updateChecklistItemText(item.id, text);
      if (result.error) {
        toast.error(result.error);
        onChange(previous);
      }
    });
  }

  function handleSaveTitle() {
    const title = titleDraft.trim();
    setEditingTitle(false);
    if (!title || title === list.title) {
      setTitleDraft(list.title);
      return;
    }
    const previous = list;
    onChange({ ...list, title });
    startTransition(async () => {
      const result = await updateChecklist(list.id, { title });
      if (result.error) {
        toast.error(result.error);
        onChange(previous);
      }
    });
  }

  function handleToggleDaily() {
    const next = !list.repeat_daily;
    const previous = list;
    onChange({
      ...list,
      repeat_daily: next,
      items: list.items.map((i) => ({ ...i, done: false, done_on: null })),
      streak: 0,
      yesterday: null,
      last7: next ? list.last7 : [],
    });
    startTransition(async () => {
      const result = await updateChecklist(list.id, { repeat_daily: next });
      if (result.error) {
        toast.error(result.error);
        onChange(previous);
      } else {
        toast.success(next ? "Este checklist agora zera todo dia." : "Este checklist não zera mais sozinho.");
      }
    });
  }

  function handleReset() {
    const previous = list;
    onChange({ ...list, items: list.items.map((i) => ({ ...i, done: false, done_on: null })) });
    startTransition(async () => {
      const result = await resetChecklist(list.id);
      if (result.error) {
        toast.error(result.error);
        onChange(previous);
      }
    });
  }

  function handleDeleteList() {
    startTransition(async () => {
      const result = await deleteChecklist(list.id);
      if (result.error) toast.error(result.error);
      else onRemove();
    });
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card/60 p-3">
      <header className="flex items-start gap-2">
        <ListChecks className={cn("mt-0.5 size-4 shrink-0", complete ? "text-emerald-500" : "text-primary")} />
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <Input
              autoFocus
              className="h-7"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") {
                  setTitleDraft(list.title);
                  setEditingTitle(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setEditingTitle(true)}
              className="block max-w-full truncate text-left text-sm font-semibold hover:text-primary disabled:hover:text-inherit"
            >
              {list.title}
            </button>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {list.repeat_daily ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 font-medium text-primary">
                <Sun className="size-3" /> Zera todo dia
              </span>
            ) : null}
            {list.repeat_daily && list.streak > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium text-amber-500">
                <Flame className="size-3" /> {list.streak} {list.streak === 1 ? "dia seguido" : "dias seguidos"}
              </span>
            ) : null}
            {list.repeat_daily && list.yesterday ? (
              <span>
                ontem {list.yesterday.done}/{list.yesterday.total}
              </span>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {done}/{total}
        </span>
        {canEdit ? (
          <Button variant="ghost" size="icon-xs" onClick={handleDeleteList} aria-label="Excluir checklist">
            <Trash2 className="text-destructive" />
          </Button>
        ) : null}
      </header>

      <div className="flex items-center gap-2">
        <span className="w-8 text-[11px] tabular-nums text-muted-foreground">{percent}%</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              complete ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-indigo-400",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {list.repeat_daily && list.last7.length > 0 ? (
        <DayStrip days={list.last7} today={today} doneToday={done} totalToday={total} />
      ) : null}

      <ul className="space-y-0.5">
        {list.items.map((item) => {
          const checked = isItemDone(item, list.repeat_daily, today);
          return (
            <li key={item.id} className="group flex items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/50">
              <label className={cn("flex min-w-0 flex-1 items-start gap-2.5", canEdit && "cursor-pointer")}>
                <Checkbox
                  checked={checked}
                  disabled={!canEdit}
                  onCheckedChange={(value) => toggle(item, Boolean(value))}
                  className="mt-0.5"
                />
                {editingItem === item.id ? (
                  <Input
                    autoFocus
                    className="h-7 flex-1"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => handleSaveItemText(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveItemText(item);
                      if (e.key === "Escape") setEditingItem(null);
                    }}
                    onClick={(e) => e.preventDefault()}
                  />
                ) : (
                  <span
                    className={cn(
                      "min-w-0 flex-1 break-words text-sm transition-colors",
                      checked && "text-muted-foreground line-through",
                    )}
                  >
                    {item.text}
                  </span>
                )}
              </label>
              {canEdit && editingItem !== item.id ? (
                <span className="flex shrink-0 items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      setEditingItem(item.id);
                      setEditText(item.text);
                    }}
                    aria-label="Editar item"
                  >
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteItem(item)} aria-label="Excluir item">
                    <X />
                  </Button>
                </span>
              ) : null}
            </li>
          );
        })}
        {list.items.length === 0 ? (
          <li className="px-1.5 py-2 text-xs text-muted-foreground">Nenhum item ainda. Adicione o primeiro abaixo.</li>
        ) : null}
      </ul>

      {canEdit ? (
        <>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
          >
            <Input
              ref={inputRef}
              className="h-8 flex-1"
              placeholder="Adicionar item (cole várias linhas para criar vários)"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text.includes("\n")) {
                  e.preventDefault();
                  setNewText(text.trim());
                }
              }}
            />
            <Button type="submit" size="sm" disabled={!newText.trim() || adding} className="gap-1">
              {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Adicionar
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2 border-t pt-2">
            <Button
              variant={list.repeat_daily ? "secondary" : "outline"}
              size="sm"
              onClick={handleToggleDaily}
              className="gap-1.5"
            >
              <Sun className="size-3.5" />
              {list.repeat_daily ? "Repete todo dia: ligado" : "Repetir todo dia"}
            </Button>
            {!list.repeat_daily && done > 0 ? (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="size-3.5" />
                Desmarcar tudo
              </Button>
            ) : null}
            {list.repeat_daily ? (
              <span className="text-[11px] text-muted-foreground">Os itens desmarcam sozinhos à meia-noite (Brasília).</span>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

export function CardChecklists({
  cardId,
  initial,
  today,
  canEdit,
  available,
}: {
  cardId: string;
  initial: ChecklistData[];
  today: string;
  canEdit: boolean;
  available: boolean;
}) {
  const [lists, setLists] = useState<LocalList[]>(initial);
  const [title, setTitle] = useState("");
  const [daily, setDaily] = useState(false);
  const [creating, startCreating] = useTransition();

  if (!available) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Os checklists ainda não estão ativos no banco de dados. Aplique a migration{" "}
        <code className="font-mono text-xs">0017_checklists_comments_links_cover.sql</code> no Supabase.
      </p>
    );
  }

  function handleCreate() {
    startCreating(async () => {
      const finalTitle = title.trim() || "Checklist";
      const result = await addChecklist(cardId, finalTitle, daily);
      if (result.error || !result.id) {
        toast.error(result.error ?? "Não foi possível criar o checklist.");
        return;
      }
      setLists((prev) => [
        ...prev,
        {
          id: result.id as string,
          title: finalTitle,
          repeat_daily: daily,
          sort_order: prev.length + 1,
          items: [],
          streak: 0,
          yesterday: null,
          last7: daily
            ? Array.from({ length: 7 }, (_, i) => {
                const [y, m, d] = today.split("-").map(Number);
                const date = new Date(Date.UTC(y, m - 1, d - (6 - i))).toISOString().slice(0, 10);
                return { date, done: 0, total: 0 };
              })
            : [],
        },
      ]);
      setTitle("");
      setDaily(false);
    });
  }

  return (
    <div className="space-y-3">
      {lists.map((list) => (
        <ChecklistBlock
          key={list.id}
          list={list}
          today={today}
          canEdit={canEdit}
          onChange={(next) => setLists((prev) => prev.map((l) => (l.id === next.id ? next : l)))}
          onRemove={() => setLists((prev) => prev.filter((l) => l.id !== list.id))}
        />
      ))}

      {lists.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          <ListChecks className="size-6 text-primary/70" />
          Nenhum checklist neste card.
          {canEdit ? <span className="text-xs">Crie um abaixo para marcar o que já foi feito.</span> : null}
        </div>
      ) : null}

      {canEdit ? (
        <form
          className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <Input
            className="h-8 min-w-40 flex-1"
            placeholder="Título do novo checklist"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={daily} onCheckedChange={(v) => setDaily(Boolean(v))} />
            Repetir todo dia
          </label>
          <Button type="submit" size="sm" disabled={creating} className="gap-1.5">
            {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Criar checklist
          </Button>
        </form>
      ) : null}
    </div>
  );
}
