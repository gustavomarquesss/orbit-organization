"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { financeiroFieldsSchema, type FinanceiroFieldsInput } from "@/lib/validations/financeiro";

export async function upsertFinanceiroDetails(
  cardId: string,
  input: FinanceiroFieldsInput,
): Promise<{ error?: string }> {
  const parsed = financeiroFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados do gasto inválidos." };
  }

  const supabase = await createClient();
  const { valor, gasto_por_id, data_inicio, recorrencia } = parsed.data;

  const { error } = await supabase
    .from("financeiro_details")
    .upsert({ card_id: cardId, valor: Number(valor), gasto_por_id, data_inicio, recorrencia }, { onConflict: "card_id" });

  if (error) return { error: "Não foi possível salvar os detalhes do gasto." };

  revalidatePath("/financeiro");
  return {};
}
