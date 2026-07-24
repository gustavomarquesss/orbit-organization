"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleAssigneeDone } from "@/lib/actions/cards";
import type { CardWithRelations } from "@/lib/queries/cards";

export function AssigneeDoneList({ card }: { card: CardWithRelations }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const assignees = card.card_responsaveis.filter(
    (cr): cr is typeof cr & { team_member: NonNullable<(typeof cr)["team_member"]> } => Boolean(cr.team_member),
  );

  if (assignees.length < 2) return null;

  function handleToggle(teamMemberId: string) {
    setPendingId(teamMemberId);
    startTransition(async () => {
      await toggleAssigneeDone(card.id, teamMemberId);
      router.refresh();
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-1.5">
      <Label>Conclusão por responsável</Label>
      <div className="flex flex-col gap-1.5 rounded-md border p-2">
        {assignees.map((cr) => (
          <label key={cr.team_member.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(cr.done_at)}
              disabled={pendingId === cr.team_member.id}
              onCheckedChange={() => handleToggle(cr.team_member.id)}
            />
            {cr.team_member.full_name}
          </label>
        ))}
      </div>
    </div>
  );
}
