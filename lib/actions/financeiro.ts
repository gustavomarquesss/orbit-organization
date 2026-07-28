"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  financeiroFieldsSchema,
  financeiroMetasSchema,
  type FinanceiroFieldsInput,
  type FinanceiroMetasInput,
} from "@/lib/validations/financeiro";

const METAS_ID = "00000000-0000-0000-0000-000000000001";

export async function upsertFinanceiroDetails(
  cardId: string,
  input: FinanceiroFieldsInput,
): Promise<{ error?: string }> {
  const parsed = financeiroFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados do lançamento inválidos." };
  }

  const supabase = await createClient();
  const { tipo, valor, gasto_por_id, data_inicio, recorrencia } = parsed.data;

  const { error } = await supabase
    .from("financeiro_details")
    .upsert(
      { card_id: cardId, tipo, valor: Number(valor), gasto_por_id, data_inicio, recorrencia },
      { onConflict: "card_id" },
    );

  if (error) return { error: "Não foi possível salvar os detalhes do lançamento." };

  revalidatePath("/financeiro");
  return {};
}

export async function upsertFinanceiroMetas(input: FinanceiroMetasInput): Promise<{ error?: string }> {
  const parsed = financeiroMetasSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Metas inválidas." };
  }

  const supabase = await createClient();
  const { meta_gastos_mensal, meta_receita_mensal } = parsed.data;

  const { error } = await supabase.from("financeiro_metas").upsert(
    {
      id: METAS_ID,
      meta_gastos_mensal: meta_gastos_mensal === "" ? 0 : Number(meta_gastos_mensal),
      meta_receita_mensal: meta_receita_mensal === "" ? 0 : Number(meta_receita_mensal),
    },
    { onConflict: "id" },
  );

  if (error) return { error: "Não foi possível salvar as metas." };

  revalidatePath("/financeiro");
  return {};
}
