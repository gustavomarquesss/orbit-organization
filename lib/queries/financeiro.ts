import { createClient } from "@/lib/supabase/server";

export type FinanceiroDetails = {
  valor: number;
  gasto_por_id: string | null;
  data_inicio: string;
  recorrencia: string;
};

export async function getFinanceiroDetails(cardId: string): Promise<FinanceiroDetails | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financeiro_details")
    .select("valor, gasto_por_id, data_inicio, recorrencia")
    .eq("card_id", cardId)
    .maybeSingle();

  if (!data) return null;

  return {
    valor: Number(data.valor),
    gasto_por_id: data.gasto_por_id,
    data_inicio: data.data_inicio,
    recorrencia: data.recorrencia,
  };
}
