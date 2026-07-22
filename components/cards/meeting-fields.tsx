import { Controller, type Control, type UseFormRegister } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TeamMemberMultiSelect } from "@/components/cards/team-member-multi-select";
import type { CardFormValues } from "@/components/cards/card-form";

export function MeetingFields({
  register,
  control,
  teamMembers,
}: {
  register: UseFormRegister<CardFormValues>;
  control: Control<CardFormValues>;
  teamMembers: { id: string; full_name: string }[];
}) {
  return (
    <div className="space-y-4 rounded-lg border border-dashed p-3">
      <p className="text-xs font-medium text-muted-foreground">Detalhes da Reunião</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="meeting_date">Data</Label>
          <Input id="meeting_date" type="date" {...register("meeting_date")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meeting_time">Horário</Label>
          <Input id="meeting_time" type="time" {...register("meeting_time")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Participantes</Label>
        <Controller
          control={control}
          name="participant_ids"
          render={({ field }) => (
            <TeamMemberMultiSelect
              teamMembers={teamMembers}
              value={field.value ?? []}
              onChange={field.onChange}
              showSelectAll
            />
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="assuntos">Assuntos</Label>
        <Textarea id="assuntos" rows={3} {...register("assuntos")} />
      </div>
    </div>
  );
}
