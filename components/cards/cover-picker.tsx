"use client";

import { useState } from "react";
import { Check, Ban } from "lucide-react";
import { toast } from "sonner";

import { setCardCover } from "@/lib/actions/card-extras";
import { cn } from "@/lib/utils";

export const COVER_COLORS = [
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#6366f1", label: "Índigo" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#06b6d4", label: "Ciano" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Âmbar" },
  { value: "#f97316", label: "Laranja" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#ec4899", label: "Rosa" },
];

// Faixa colorida no topo do card (aparece no quadro Kanban e no modal).
export function CoverPicker({
  cardId,
  initial,
  canEdit,
}: {
  cardId: string;
  initial: string | null;
  canEdit: boolean;
}) {
  const [color, setColor] = useState<string | null>(initial);

  function choose(next: string | null) {
    if (!canEdit || next === color) return;
    const previous = color;
    setColor(next);
    setCardCover(cardId, next).then((result) => {
      if (result.error) {
        toast.error(result.error);
        setColor(previous);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div
        className="h-10 w-full rounded-lg border transition-colors"
        style={color ? { background: `linear-gradient(135deg, ${color}, ${color}99)`, borderColor: `${color}66` } : undefined}
      >
        {color ? null : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem capa</div>
        )}
      </div>
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => choose(null)}
            aria-label="Sem capa"
            title="Sem capa"
            className={cn(
              "flex size-6 items-center justify-center rounded-full border text-muted-foreground transition-transform hover:scale-110",
              !color && "ring-2 ring-primary ring-offset-1 ring-offset-background",
            )}
          >
            <Ban className="size-3.5" />
          </button>
          {COVER_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => choose(c.value)}
              aria-label={`Capa ${c.label}`}
              title={c.label}
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-white transition-transform hover:scale-110",
                color === c.value && "ring-2 ring-primary ring-offset-1 ring-offset-background",
              )}
              style={{ backgroundColor: c.value }}
            >
              {color === c.value ? <Check className="size-3.5" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
