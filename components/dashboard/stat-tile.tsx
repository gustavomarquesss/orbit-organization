import type { LucideIcon } from "lucide-react";

export function StatTile({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4.5 text-muted-foreground" />
      </div>
      <div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
