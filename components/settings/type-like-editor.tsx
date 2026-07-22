"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createLookupItem, toggleLookupActive } from "@/lib/actions/lookups";

type Item = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  emoji?: string;
  color?: string;
};

export function TypeLikeEditor({
  table,
  items,
  colorField,
}: {
  table: "card_types" | "statuses" | "priorities";
  items: Item[];
  colorField: "emoji" | "color";
}) {
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newExtra, setNewExtra] = useState(colorField === "emoji" ? "" : "#6366f1");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!newLabel.trim() || !newKey.trim()) {
      setError("Preencha nome e chave.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createLookupItem(table, {
        key: newKey.trim(),
        label: newLabel.trim(),
        sort_order: items.length + 1,
        [colorField]: newExtra,
      });
      if (result.error) setError(result.error);
      else {
        setNewLabel("");
        setNewKey("");
      }
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleLookupActive(table, id, !current);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border p-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{colorField === "emoji" ? "Emoji" : "Cor"}</label>
          {colorField === "color" ? (
            <input
              type="color"
              className="h-8 w-14 rounded-md border bg-transparent"
              value={newExtra}
              onChange={(e) => setNewExtra(e.target.value)}
            />
          ) : (
            <Input className="h-8 w-16" value={newExtra} onChange={(e) => setNewExtra(e.target.value)} placeholder="🎥" />
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nome</label>
          <Input className="h-8 w-40" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Chave</label>
          <Input
            className="h-8 w-32"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="ex: podcast"
          />
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
              <TableHead>{colorField === "emoji" ? "Emoji" : "Cor"}</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Chave</TableHead>
              <TableHead className="w-28">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {colorField === "emoji" ? (
                    item.emoji
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.color}
                    </span>
                  )}
                </TableCell>
                <TableCell>{item.label}</TableCell>
                <TableCell className="text-muted-foreground">{item.key}</TableCell>
                <TableCell>
                  <Button
                    variant={item.is_active ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleToggle(item.id, item.is_active)}
                    disabled={isPending}
                  >
                    {item.is_active ? "Ativo" : "Inativo"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
