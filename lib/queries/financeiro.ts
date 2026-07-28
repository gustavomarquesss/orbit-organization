import { createClient } from "@/lib/supabase/server";

export type FinanceiroDetails = {
  tipo: "gasto" | "receita";
  valor: number;
  gasto_por_id: string | null;
  data_inicio: string;
  recorrencia: string;
};

export async function getFinanceiroDetails(cardId: string): Promise<FinanceiroDetails | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financeiro_details")
    .select("tipo, valor, gasto_por_id, data_inicio, recorrencia")
    .eq("card_id", cardId)
    .maybeSingle();

  if (!data) return null;

  return {
    tipo: data.tipo as "gasto" | "receita",
    valor: Number(data.valor),
    gasto_por_id: data.gasto_por_id,
    data_inicio: data.data_inicio,
    recorrencia: data.recorrencia,
  };
}

export type FinanceiroMetas = {
  metaGastosMensal: number;
  metaReceitaMensal: number;
};

const METAS_ID = "00000000-0000-0000-0000-000000000001";

export async function getFinanceiroMetas(): Promise<FinanceiroMetas> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financeiro_metas")
    .select("meta_gastos_mensal, meta_receita_mensal")
    .eq("id", METAS_ID)
    .maybeSingle();

  return {
    metaGastosMensal: Number(data?.meta_gastos_mensal ?? 0),
    metaReceitaMensal: Number(data?.meta_receita_mensal ?? 0),
  };
}

export type FinanceiroSummary = {
  totalGastos: number;
  totalReceitas: number;
  lucro: number;
  gastosMesAtual: number;
  receitasMesAtual: number;
};

// "Mês atual" é baseado em data_inicio: cobre lançamentos únicos criados no mês
// e lançamentos recorrentes cujo ciclo caiu neste mês (aproximação simples por
// data de início, sem projetar recorrências futuras/passadas).
export async function getFinanceiroSummary(): Promise<FinanceiroSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("financeiro_details").select("tipo, valor, data_inicio");
  if (error) throw error;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

  let totalGastos = 0;
  let totalReceitas = 0;
  let gastosMesAtual = 0;
  let receitasMesAtual = 0;

  for (const row of data ?? []) {
    const valor = Number(row.valor);
    const isMesAtual = row.data_inicio >= monthStart && row.data_inicio < monthEnd;
    if (row.tipo === "receita") {
      totalReceitas += valor;
      if (isMesAtual) receitasMesAtual += valor;
    } else {
      totalGastos += valor;
      if (isMesAtual) gastosMesAtual += valor;
    }
  }

  return {
    totalGastos,
    totalReceitas,
    lucro: totalReceitas - totalGastos,
    gastosMesAtual,
    receitasMesAtual,
  };
}
