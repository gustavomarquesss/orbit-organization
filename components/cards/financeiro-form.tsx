"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCard, deleteCard, duplicateCard, updateCard } from "@/lib/actions/cards";
import { upsertFinanceiroDetails } from "@/lib/actions/financeiro";
import { financeiroFieldsSchema, RECORRENCIA_OPTIONS } from "@/lib/validations/financeiro";
import type { CardFormInput } from "@/lib/validations/card";
import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { FinanceiroDetails } from "@/lib/queries/financeiro";

const financeiroFormValuesSchema = z
  .object({
    title: z.string().trim().min(1, "Informe um título.").max(200, "Título muito longo."),
  })
  .merge(financeiroFieldsSchema);

type FinanceiroFormValues = z.infer<typeof financeiroFormValuesSchema>;

function toDefaultValues(card?: CardWithRelations | null, details?: FinanceiroDetails | null): FinanceiroFormValues {
  return {
    title: card?.title ?? "",
    valor: details ? String(details.valor) : "",
    gasto_por_id: details?.gasto_por_id ?? "",
    data_inicio: details?.data_inicio ?? "",
    recorrencia: (details?.recorrencia as FinanceiroFormValues["recorrencia"]) ?? "mensal",
  };
}

export function FinanceiroForm({
  lookups,
  financeiroTypeId,
  card,
  financeiroDetails,
  onSuccess,
  onCancel,
}: {
  lookups: CardLookups;
  financeiroTypeId: string;
  card?: CardWithRelations | null;
  financeiroDetails?: FinanceiroDetails | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEditing = Boolean(card);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FinanceiroFormValues>({
    resolver: zodResolver(financeiroFormValuesSchema),
    defaultValues: toDefaultValues(card, financeiroDetails),
  });

  async function onSubmit(values: FinanceiroFormValues) {
    setServerError(null);

    const defaultStatusId = lookups.statuses.find((s) => s.key === "a_fazer")?.id ?? lookups.statuses[0]?.id ?? "";
    const defaultPriorityId = lookups.priorities.find((p) => p.key === "baixa")?.id ?? lookups.priorities[0]?.id ?? "";

    const cardPayload: CardFormInput = {
      title: values.title,
      description: card?.description ?? undefined,
      card_type_id: card?.card_type?.id ?? financeiroTypeId,
      modelo_ids: card?.card_modelos.map((cm) => cm.modelo?.id).filter((id): id is string => Boolean(id)) ?? [],
      status_id: card?.status?.id ?? defaultStatusId,
      priority_id: card?.priority?.id ?? defaultPriorityId,
      responsavel_ids:
        card?.card_responsaveis.map((cr) => cr.team_member?.id).filter((id): id is string => Boolean(id)) ?? [],
      observacoes: card?.observacoes ?? undefined,
      tag_ids: card?.card_tags.map((ct) => ct.tag?.id).filter((id): id is string => Boolean(id)) ?? [],
    };

    const result = isEditing && card ? await updateCard(card.id, cardPayload) : await createCard(cardPayload);
    if (result.error || !result.id) {
      setServerError(result.error ?? "Não foi possível salvar o gasto.");
      return;
    }

    const { title: _title, ...financeiroValues } = values;
    void _title;
    const detailsResult = await upsertFinanceiroDetails(result.id, financeiroValues);
    if (detailsResult.error) {
      setServerError(detailsResult.error);
      return;
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
      <div className="space-y-1.5">
        <Label htmlFor="title">Título/Ferramenta</Label>
        <Input id="title" {...register("title")} placeholder="Ex.: Assinatura do Canva" />
        {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="valor">Valor</Label>
        <Input id="valor" type="number" step="0.01" min="0" {...register("valor")} placeholder="0,00" />
        {errors.valor ? <p className="text-xs text-destructive">{errors.valor.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gasto_por_id">Quem assinou/gastou</Label>
        <Controller
          control={control}
          name="gasto_por_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="gasto_por_id" className="w-full">
                <SelectValue placeholder="Selecione...">
                  {(value: string) => lookups.teamMembers.find((m) => m.id === value)?.full_name ?? "Selecione..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {lookups.teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.gasto_por_id ? <p className="text-xs text-destructive">{errors.gasto_por_id.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label>Assinatura/tempo de validade</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="data_inicio" className="text-xs font-normal text-muted-foreground">
              Início
            </Label>
            <Input id="data_inicio" type="date" {...register("data_inicio")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recorrencia" className="text-xs font-normal text-muted-foreground">
              Recorrência
            </Label>
            <Controller
              control={control}
              name="recorrencia"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="recorrencia" className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORRENCIA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        {errors.data_inicio ? <p className="text-xs text-destructive">{errors.data_inicio.message}</p> : null}
        {errors.recorrencia ? <p className="text-xs text-destructive">{errors.recorrencia.message}</p> : null}
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
