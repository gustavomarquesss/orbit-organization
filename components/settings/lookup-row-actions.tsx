"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteLookupItem, getLookupUsage, type LookupTable } from "@/lib/actions/lookups";

type Usage = { count: number; protected: boolean; error?: string };

// Botão de lixeira com confirmação. Ao abrir, consulta quantos cards usam o item para
// explicar exatamente o que vai acontecer (limpar vínculo, bloquear ou liberar).
export function DeleteLookupButton({
  table,
  id,
  name,
  disabled,
  onDeleted,
}: {
  table: LookupTable;
  id: string;
  name: string;
  disabled?: boolean;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);

  const clearsOnDelete = table === "modelos" || table === "tags";

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setUsage(null);
    setUsage(await getLookupUsage(table, id));
  }

  async function handleConfirm() {
    const result = await deleteLookupItem(table, id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${name}" excluído.`);
    onDeleted?.();
  }

  const blocked = usage ? usage.protected || (!clearsOnDelete && usage.count > 0) : false;

  let description: React.ReactNode;
  if (!usage) {
    description = (
      <span className="flex items-center gap-2">
        <Loader2 className="size-3.5 animate-spin" /> Verificando uso...
      </span>
    );
  } else if (usage.error) {
    description = usage.error;
  } else if (usage.protected) {
    description = "Este item é usado pelo sistema e não pode ser excluído. Você pode renomeá-lo ou desativá-lo.";
  } else if (!clearsOnDelete && usage.count > 0) {
    description = `Está em uso em ${usage.count} card${usage.count > 1 ? "s" : ""}. Mude esses cards para outro item ou desative este em vez de excluir.`;
  } else if (clearsOnDelete && usage.count > 0) {
    description = `Será removido de ${usage.count} card${usage.count > 1 ? "s" : ""} e excluído. Essa ação não pode ser desfeita.`;
  } else {
    description = "Não está em uso em nenhum card. Essa ação não pode ser desfeita.";
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="icon-sm" disabled={disabled} aria-label={`Excluir ${name}`} />}
      >
        <Trash2 className="size-4 text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir &ldquo;{name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{blocked ? "Entendi" : "Cancelar"}</AlertDialogCancel>
          {blocked || !usage || usage.error ? null : (
            <AlertDialogAction onClick={handleConfirm}>Excluir</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ReorderButtons({
  onMove,
  isFirst,
  isLast,
  disabled,
}: {
  onMove: (direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex flex-col">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onMove("up")}
        disabled={disabled || isFirst}
        aria-label="Mover para cima"
      >
        <ChevronUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onMove("down")}
        disabled={disabled || isLast}
        aria-label="Mover para baixo"
      >
        <ChevronDown />
      </Button>
    </span>
  );
}
