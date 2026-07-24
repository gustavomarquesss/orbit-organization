import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Circle, History, Pencil, Sparkles, UserMinus, UserPlus } from "lucide-react";

import { formatRelative } from "@/lib/utils/dates";
import type { CardActivityEntry } from "@/lib/queries/cards";

function nameFromPayload(payload: Record<string, unknown>): string {
  return typeof payload.team_member_name === "string" ? payload.team_member_name : "alguém";
}

function describeActivity(entry: CardActivityEntry): { icon: LucideIcon; label: string } {
  const actorName = entry.actor?.full_name ?? "Alguém";
  const payload = entry.payload;

  switch (entry.event_type) {
    case "created":
      return { icon: Sparkles, label: `${actorName} criou o card` };
    case "updated":
      return { icon: Pencil, label: `${actorName} editou o card` };
    case "status_changed": {
      const toLabel = typeof payload.to_label === "string" ? payload.to_label : null;
      const fromLabel = typeof payload.from_label === "string" ? payload.from_label : null;
      if (toLabel === "Concluído") return { icon: CheckCircle2, label: `${actorName} concluiu o card` };
      if (fromLabel === "Concluído") return { icon: Circle, label: `${actorName} reabriu o card` };
      return {
        icon: Pencil,
        label: `${actorName} mudou o status${fromLabel ? ` de ${fromLabel}` : ""}${toLabel ? ` para ${toLabel}` : ""}`,
      };
    }
    case "assignee_added":
      return { icon: UserPlus, label: `${actorName} adicionou ${nameFromPayload(payload)} como responsável` };
    case "assignee_removed":
      return { icon: UserMinus, label: `${actorName} removeu ${nameFromPayload(payload)} como responsável` };
    case "assignee_done":
      return { icon: CheckCircle2, label: `${actorName} marcou a parte de ${nameFromPayload(payload)} como feita` };
    case "assignee_undone":
      return { icon: Circle, label: `${actorName} desmarcou a parte de ${nameFromPayload(payload)}` };
    default:
      return { icon: History, label: `${actorName} atualizou o card` };
  }
}

export function CardHistoryPanel({ entries, loading }: { entries: CardActivityEntry[]; loading?: boolean }) {
  if (loading) {
    return <p className="text-xs text-muted-foreground">Carregando histórico...</p>;
  }
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma atividade registrada ainda.</p>;
  }
  return (
    <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
      {entries.map((entry) => {
        const { icon: Icon, label } = describeActivity(entry);
        return (
          <li key={entry.id} className="flex items-start gap-2 text-xs">
            <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1">
              {label}
              <span className="ml-1 text-muted-foreground">· {formatRelative(entry.created_at)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
