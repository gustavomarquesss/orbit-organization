"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteLookupButton } from "@/components/settings/lookup-row-actions";
import { createLookupItem, toggleLookupActive, updateLookupItem } from "@/lib/actions/lookups";

type Item = { id: string; name: string; is_active?: boolean };

export function SimpleListEditor({
  table,
  items,
  hasActiveToggle,
}: {
  table: "modelos" | "tags";
  items: Item[];
  hasActiveToggle: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createLookupItem(table, { name });
      if (result.error) toast.error(result.error);
      else {
        toast.success(`"${name}" adicionado.`);
        setNewName("");
      }
    });
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditingName(item.name);
  }

  function handleSaveEdit(item: Item) {
    const name = editingName.trim();
    if (!name || name === item.name) {
      setEditingId(null);
      return;
    }
    setBusyId(item.id);
    startTransition(async () => {
      const result = await updateLookupItem(table, item.id, { name });
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

  return (
    <div className="space-y-4">
      <form
        className="flex items-end gap-2 rounded-xl border bg-card/60 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
      >
        <div className="min-w-0 flex-1 space-y-1 sm:max-w-xs">
          <label htmlFor={`new-${table}`} className="block text-xs text-muted-foreground">
            Novo item
          </label>
          <Input
            id={`new-${table}`}
            className="h-8"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Digite o nome e tecle Enter"
          />
        </div>
        <Button size="sm" type="submit" disabled={isPending || !newName.trim()} className="gap-1.5">
          {isPending && !busyId ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Adicionar
        </Button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-card/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              {hasActiveToggle ? <TableHead className="w-28">Status</TableHead> : null}
              <TableHead className="w-28 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  Nenhum item ainda. Adicione o primeiro acima.
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((item) => {
              const editing = editingId === item.id;
              const busy = busyId === item.id;
              return (
                <TableRow key={item.id} className={item.is_active === false ? "opacity-60" : undefined}>
                  <TableCell>
                    {editing ? (
                      <Input
                        autoFocus
                        className="h-8 max-w-xs"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(item);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      item.name
                    )}
                  </TableCell>
                  {hasActiveToggle ? (
                    <TableCell>
                      <Button
                        variant={item.is_active ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleToggle(item.id, item.is_active ?? true)}
                        disabled={isPending}
                      >
                        {busy && !editing ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        {item.is_active ? "Ativo" : "Inativo"}
                      </Button>
                    </TableCell>
                  ) : null}
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
                            aria-label={`Editar ${item.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <DeleteLookupButton table={table} id={item.id} name={item.name} disabled={isPending} />
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
