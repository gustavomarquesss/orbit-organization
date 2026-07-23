import { z } from "zod";

export const RECORRENCIA_OPTIONS = [
  { value: "unico", label: "Único" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
] as const;

export const financeiroFieldsSchema = z.object({
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
