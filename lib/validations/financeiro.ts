import { z } from "zod";

export const RECORRENCIA_OPTIONS = [
  { value: "unico", label: "Único" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
] as const;

export const TIPO_OPTIONS = [
  { value: "gasto", label: "Gasto" },
  { value: "receita", label: "Receita" },
] as const;

export const financeiroFieldsSchema = z.object({
  tipo: z.enum(["gasto", "receita"], { message: "Selecione o tipo." }),
  valor: z
    .string()
    .min(1, "Informe um valor.")
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, "O valor deve ser maior que zero."),
  gasto_por_id: z.string().min(1, "Selecione quem assinou/gastou."),
  data_inicio: z.string().min(1, "Informe a data."),
  recorrencia: z.enum(["unico", "mensal", "trimestral", "semestral", "anual"], {
    message: "Selecione a recorrência.",
  }),
});

export type FinanceiroFieldsInput = z.infer<typeof financeiroFieldsSchema>;

export const financeiroMetasSchema = z.object({
  meta_gastos_mensal: z
    .string()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), "Informe um valor válido."),
  meta_receita_mensal: z
    .string()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), "Informe um valor válido."),
});

export type FinanceiroMetasInput = z.infer<typeof financeiroMetasSchema>;
