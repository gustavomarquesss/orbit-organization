"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { upsertFinanceiroMetas } from "@/lib/actions/financeiro";
import { financeiroMetasSchema, type FinanceiroMetasInput } from "@/lib/validations/financeiro";
import type { FinanceiroMetas } from "@/lib/queries/financeiro";

export function MetasDialog({ metas }: { metas: FinanceiroMetas }) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FinanceiroMetasInput>({
    resolver: zodResolver(financeiroMetasSchema),
    defaultValues: {
      meta_gastos_mensal: metas.metaGastosMensal ? String(metas.metaGastosMensal) : "",
      meta_receita_mensal: metas.metaReceitaMensal ? String(metas.metaReceitaMensal) : "",
    },
  });

  async function onSubmit(values: FinanceiroMetasInput) {
    setServerError(null);
    const result = await upsertFinanceiroMetas(values);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Target className="size-4" />
        Editar Metas
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Metas mensais</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="meta_gastos_mensal">Limite de gastos por mês</Label>
              <Input
                id="meta_gastos_mensal"
                type="number"
                step="0.01"
                min="0"
                {...register("meta_gastos_mensal")}
                placeholder="0,00"
              />
              {errors.meta_gastos_mensal ? (
                <p className="text-xs text-destructive">{errors.meta_gastos_mensal.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="meta_receita_mensal">Meta de receita por mês</Label>
              <Input
                id="meta_receita_mensal"
                type="number"
                step="0.01"
                min="0"
                {...register("meta_receita_mensal")}
                placeholder="0,00"
              />
              {errors.meta_receita_mensal ? (
                <p className="text-xs text-destructive">{errors.meta_receita_mensal.message}</p>
              ) : null}
            </div>

            {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
