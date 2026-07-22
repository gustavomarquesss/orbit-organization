"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createLookupItem, deleteLookupItem, toggleLookupActive } from "@/lib/actions/lookups";

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
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createLookupItem(table, { name: newName.trim() });
      if (result.error) setError(result.error);
      else setNewName("");
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleLookupActive(table, id, !current);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteLookupItem(table, id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 rounded-xl border p-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nome</label>
          <Input className="h-8 w-56" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </div>
        <Button size="sm" onClick={handleCreate} disabled={isPending} className="gap-1.5">
          <Plus className="size-4" />
          Novo
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-28">{hasActiveToggle ? "Status" : "Ações"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>
                  {hasActiveToggle ? (
                    <Button
                      variant={item.is_active ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleToggle(item.id, item.is_active ?? true)}
                      disabled={isPending}
                    >
                      {item.is_active ? "Ativo" : "Inativo"}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(item.id)} disabled={isPending}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
