"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Lock, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteLookupButton, ReorderButtons } from "@/components/settings/lookup-row-actions";
import { createLookupItem, moveLookupItem, toggleLookupActive, updateLookupItem } from "@/lib/actions/lookups";

type Item = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  emoji?: string;
  color?: string;
};

type LookupKind = "card_types" | "statuses" | "priorities";

// Itens que o código usa por baixo dos panos: dá para renomear/recolorir, mas não excluir.
const PROTECTED_KEYS: Record<LookupKind, string[]> = {
  statuses: ["a_fazer", "concluido", "arquivado"],
  priorities: ["urgente"],
  card_types: ["financeiro", "reuniao"],
};

const ORDER_HINT: Record<LookupKind, string> = {
  statuses: "A ordem dos status define a ordem das colunas no quadro de Cards.",
  priorities: "A ordem define como as prioridades aparecem nos seletores e filtros.",
  card_types: "A ordem define como os tipos aparecem nos seletores e filtros.",
};

export function TypeLikeEditor({
  table,
  items,
  colorField,
}: {
  table: LookupKind;
  items: Item[];
  colorField: "emoji" | "color";
}) {
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newExtra, setNewExtra] = useState(colorField === "emoji" ? "" : "#8b5cf6");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editExtra, setEditExtra] = useState("");

  const extraLabel = colorField === "emoji" ? "Emoji" : "Cor";

  function handleCreate() {
    if (!newLabel.trim() || !newExtra.trim()) {
      toast.error(colorField === "emoji" ? "Preencha o emoji e o nome." : "Preencha a cor e o nome.");
      return;
    }
    startTransition(async () => {
      const result = await createLookupItem(table, { label: newLabel.trim(), [colorField]: newExtra.trim() });
      if (result.error) toast.error(result.error);
      else {
        toast.success(`"${newLabel.trim()}" adicionado.`);
        setNewLabel("");
      }
    });
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditExtra((colorField === "emoji" ? item.emoji : item.color) ?? "");
  }

  function handleSaveEdit(item: Item) {
    setBusyId(item.id);
    startTransition(async () => {
      const result = await updateLookupItem(table, item.id, { label: editLabel, [colorField]: editExtra });
      setBusyId(null);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Alteração salva.");
        setEditingId(null);
      }
    });
  }

  function handleToggle(id: string, current: boolean) {
    setBusyId(id);
    startTransition(async () => {
      const result = await toggleLookupActive(table, id, !current);
      setBusyId(null);
      if (result.error) toast.error(result.error);
    });
  }

  function handleMove(id: string, direction: "up" | "down") {
    setBusyId(id);
    startTransition(async () => {
      const result = await moveLookupItem(table, id, direction);
      setBusyId(null);
      if (result.error) toast.error(result.error);
    });
  }

  function renderExtraInput(value: string, onChange: (v: string) => void) {
    return colorField === "color" ? (
      <input
        type="color"
        aria-label="Cor"
        className="h-8 w-14 cursor-pointer rounded-md border bg-transparent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <Input className="h-8 w-16 text-center" value={value} onChange={(e) => onChange(e.target.value)} placeholder="🎥" />
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-2 rounded-xl border bg-card/60 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
      >
        <div className="space-y-1">
          <label className="block text-xs text-muted-foreground">{extraLabel}</label>
          {renderExtraInput(newExtra, setNewExtra)}
        </div>
        <div className="min-w-40 flex-1 space-y-1 sm:max-w-xs">
          <label htmlFor={`new-${table}`} className="block text-xs text-muted-foreground">
            Nome
          </label>
          <Input
            id={`new-${table}`}
            className="h-8"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Digite o nome e tecle Enter"
          />
        </div>
        <Button size="sm" type="submit" disabled={isPending || !newLabel.trim()} className="gap-1.5">
          {isPending && !busyId ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Adicionar
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">{ORDER_HINT[table]}</p>

      <div className="overflow-x-auto rounded-xl border bg-card/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Ordem</TableHead>
              <TableHead className="w-28">{extraLabel}</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const editing = editingId === item.id;
              const busy = busyId === item.id;
              const isProtected = PROTECTED_KEYS[table].includes(item.key);
              return (
                <TableRow key={item.id} className={item.is_active ? undefined : "opacity-60"}>
                  <TableCell>
                    <ReorderButtons
                      onMove={(direction) => handleMove(item.id, direction)}
                      isFirst={index === 0}
                      isLast={index === items.length - 1}
                      disabled={isPending}
                    />
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      renderExtraInput(editExtra, setEditExtra)
                    ) : colorField === "emoji" ? (
                      <span className="text-lg">{item.emoji}</span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className="size-4 rounded-full ring-2 ring-white/10"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.color}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        autoFocus
                        className="h-8 max-w-xs"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(item);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        {item.label}
                        {isProtected ? (
                          <span title="Item do sistema: pode renomear, mas não excluir">
                            <Lock className="size-3 text-muted-foreground" />
                          </span>
                        ) : null}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={item.is_active ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleToggle(item.id, item.is_active)}
                      disabled={isPending}
                    >
                      {busy && !editing ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      {item.is_active ? "Ativo" : "Inativo"}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      {editing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleSaveEdit(item)}
                            disabled={isPending}
                            aria-label="Salvar"
                          >
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 text-emerald-500" />}
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)} aria-label="Cancelar">
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => startEdit(item)}
                            disabled={isPending}
                            aria-label={`Editar ${item.label}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {isProtected ? null : (
                            <DeleteLookupButton table={table} id={item.id} name={item.label} disabled={isPending} />
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
