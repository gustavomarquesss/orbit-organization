"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput, type TagOption } from "@/components/cards/tag-input";
import { MeetingFields } from "@/components/cards/meeting-fields";
import { MultiSelectChips } from "@/components/cards/multi-select-chips";
import { AssigneeDoneList } from "@/components/cards/assignee-done-list";
import { getCardTypeIcon } from "@/lib/utils/card-type-icons";
import { CARD_RECORRENCIA_OPTIONS } from "@/lib/utils/recorrencia";
import { createCard, deleteCard, duplicateCard, updateCard } from "@/lib/actions/cards";
import { deleteMeetingDetails, upsertMeetingDetails } from "@/lib/actions/meetings";
import { cardFormSchema } from "@/lib/validations/card";
import { meetingFieldsSchema } from "@/lib/validations/meeting";
import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { MeetingDetails } from "@/lib/queries/meetings";

// meeting_date não usa o schema estrito de meetingFieldsSchema (min(1)) aqui:
// o valor padrão é "" para cards que não são Reunião, e a exigência de data
// só quando isReuniao é verificada manualmente no onSubmit abaixo.
const cardFormValuesSchema = cardFormSchema.extend({
  meeting_date: z.string().optional(),
  meeting_time: meetingFieldsSchema.shape.meeting_time,
  assuntos: meetingFieldsSchema.shape.assuntos,
  participant_ids: meetingFieldsSchema.shape.participant_ids,
});

export type CardFormValues = z.infer<typeof cardFormValuesSchema>;

function toDefaultValues(card?: CardWithRelations | null, meeting?: MeetingDetails | null): CardFormValues {
  return {
    title: card?.title ?? "",
    description: card?.description ?? "",
    card_type_id: card?.card_type?.id ?? "",
    modelo_ids: card?.card_modelos?.map((cm) => cm.modelo?.id).filter((id): id is string => Boolean(id)) ?? [],
    status_id: card?.status?.id ?? "",
    priority_id: card?.priority?.id ?? "",
    responsavel_ids:
      card?.card_responsaveis?.map((cr) => cr.team_member?.id).filter((id): id is string => Boolean(id)) ?? [],
    observacoes: card?.observacoes ?? "",
    tag_ids: card?.card_tags?.map((ct) => ct.tag?.id).filter((id): id is string => Boolean(id)) ?? [],
    recorrencia: (card?.recorrencia as CardFormValues["recorrencia"]) ?? "",
    prazo_data: card?.prazo_data ?? "",
    prazo_hora: card?.prazo_hora ?? "",
    meeting_date: meeting?.meeting_date ?? "",
    meeting_time: meeting?.meeting_time ?? "",
    assuntos: meeting?.assuntos ?? "",
    participant_ids: meeting?.participant_ids ?? [],
  };
}

export function CardForm({
  lookups,
  card,
  meetingDetails,
  onSuccess,
  onCancel,
}: {
  lookups: CardLookups;
  card?: CardWithRelations | null;
  meetingDetails?: MeetingDetails | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEditing = Boolean(card);
  const [serverError, setServerError] = useState<string | null>(null);
  const [tagOptions, setTagOptions] = useState<TagOption[]>(lookups.tags);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardFormValuesSchema),
    defaultValues: toDefaultValues(card, meetingDetails),
  });

  // O tipo Financeiro tem seu próprio formulário (aba Financeiro) e nunca
  // aparece como opção manual aqui.
  const visibleCardTypes = lookups.cardTypes.filter((t) => t.key !== "financeiro");

  const selectedTypeId = watch("card_type_id");
  const isReuniao = lookups.cardTypes.find((t) => t.id === selectedTypeId)?.key === "reuniao";

  async function onSubmit(values: CardFormValues) {
    setServerError(null);

    if (isReuniao && !values.meeting_date) {
      setServerError("Informe a data da reunião.");
      return;
    }

    const { meeting_date, meeting_time, assuntos, participant_ids, ...cardValues } = values;
    const result = isEditing && card ? await updateCard(card.id, cardValues) : await createCard(cardValues);

    if (result.error || !result.id) {
      setServerError(result.error ?? "Não foi possível salvar o card.");
      return;
    }

    if (isReuniao) {
      const meetingResult = await upsertMeetingDetails(result.id, {
        meeting_date: meeting_date ?? "",
        meeting_time,
        assuntos,
        participant_ids,
      });
      if (meetingResult.error) {
        setServerError(meetingResult.error);
        return;
      }
    } else if (isEditing) {
      await deleteMeetingDetails(result.id);
    }

    onSuccess();
  }

  async function handleDelete() {
    if (!card) return;
    setIsDeleting(true);
    const result = await deleteCard(card.id);
    setIsDeleting(false);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    onSuccess();
  }

  async function handleDuplicate() {
    if (!card) return;
    setIsDuplicating(true);
    const result = await duplicateCard(card.id);
    setIsDuplicating(false);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isEditing && card ? (
        <p className="font-mono text-xs text-muted-foreground">Card #{card.card_number}</p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="card_type_id">Tipo</Label>
        <Controller
          control={control}
          name="card_type_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="card_type_id" className="w-full">
                <SelectValue placeholder="Selecione...">
                  {(value: string) => {
                    const type = lookups.cardTypes.find((t) => t.id === value);
                    if (!type) return "Selecione...";
                    const Icon = getCardTypeIcon(type.key);
                    return (
                      <span className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        {type.label}
                      </span>
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {visibleCardTypes.map((type) => {
                  const Icon = getCardTypeIcon(type.key);
                  return (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        {type.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        />
        {errors.card_type_id ? <p className="text-xs text-destructive">{errors.card_type_id.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input id="title" {...register("title")} placeholder="Ex.: Vídeo de story sobre..." />
        {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" rows={3} {...register("description")} />
      </div>

      {isReuniao ? (
        <MeetingFields register={register} control={control} teamMembers={lookups.teamMembers} />
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="status_id">Status</Label>
          <Controller
            control={control}
            name="status_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status_id" className="w-full">
                  <SelectValue placeholder="Selecione...">
                    {(value: string) => lookups.statuses.find((s) => s.id === value)?.label ?? "Selecione..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {lookups.statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.status_id ? <p className="text-xs text-destructive">{errors.status_id.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="priority_id">Prioridade</Label>
          <Controller
            control={control}
            name="priority_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="priority_id" className="w-full">
                  <SelectValue placeholder="Selecione...">
                    {(value: string) => lookups.priorities.find((p) => p.id === value)?.label ?? "Selecione..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {lookups.priorities.map((priority) => (
                    <SelectItem key={priority.id} value={priority.id}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.priority_id ? <p className="text-xs text-destructive">{errors.priority_id.message}</p> : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Responsáveis</Label>
        <Controller
          control={control}
          name="responsavel_ids"
          render={({ field }) => (
            <MultiSelectChips
              options={lookups.teamMembers.map((m) => ({ id: m.id, label: m.full_name }))}
              value={field.value}
              onChange={field.onChange}
              showSelectAll
            />
          )}
        />
      </div>

      {isEditing && card ? <AssigneeDoneList card={card} /> : null}

      <div className="space-y-1.5">
        <Label>Modelo</Label>
        <Controller
          control={control}
          name="modelo_ids"
          render={({ field }) => (
            <MultiSelectChips
              options={lookups.modelos.map((m) => ({ id: m.id, label: m.name }))}
              value={field.value}
              onChange={field.onChange}
              showSelectAll
              selectAllLabel="Todas"
              clearAllLabel="Limpar todas"
            />
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="recorrencia">Recorrência</Label>
        <Controller
          control={control}
          name="recorrencia"
          render={({ field }) => (
            <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
              <SelectTrigger id="recorrencia" className="w-full">
                <SelectValue placeholder="Nenhuma">
                  {(value: string) =>
                    CARD_RECORRENCIA_OPTIONS.find((o) => o.value === value)?.label ?? "Nenhuma"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {CARD_RECORRENCIA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Ao concluir um card recorrente, um novo já é criado automaticamente para o próximo ciclo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="prazo_data">Prazo</Label>
          <Input id="prazo_data" type="date" {...register("prazo_data")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prazo_hora">Hora do prazo</Label>
          <Input id="prazo_hora" type="time" {...register("prazo_hora")} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Se definido, os responsáveis recebem um lembrete por notificação próximo do prazo.
      </p>

      <div className="space-y-1.5">
        <Label>Tags</Label>
        <Controller
          control={control}
          name="tag_ids"
          render={({ field }) => (
            <TagInput
              options={tagOptions}
              value={field.value}
              onChange={field.onChange}
              onOptionsChange={setTagOptions}
            />
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" rows={2} {...register("observacoes")} />
      </div>

      {isEditing ? (
        <p className="text-xs text-muted-foreground">
          Criado por {card?.created_by_member?.full_name ?? "—"} · Editado por {card?.updated_by_member?.full_name ?? "—"}
        </p>
      ) : null}

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <div className="flex items-center justify-between gap-2 pt-2">
        {isEditing ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting || isDuplicating}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
              disabled={isDeleting || isSubmitting || isDuplicating}
            >
              {isDuplicating ? "Duplicando..." : "Duplicar"}
            </Button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting || isDeleting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
