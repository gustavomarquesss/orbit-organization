import { z } from "zod";

export const cardFormSchema = z.object({
  title: z.string().trim().min(1, "Informe um título.").max(200, "Título muito longo."),
  description: z.string().trim().max(5000, "Descrição muito longa.").optional(),
  card_type_id: z.string().min(1, "Selecione um tipo."),
  modelo_ids: z.array(z.string()),
  status_id: z.string().min(1, "Selecione um status."),
  priority_id: z.string().min(1, "Selecione uma prioridade."),
  responsavel_ids: z.array(z.string()),
  observacoes: z.string().trim().max(5000, "Observações muito longas.").optional(),
  tag_ids: z.array(z.string()),
  recorrencia: z.enum(["", "diaria", "semanal", "quinzenal", "mensal"]).optional(),
  prazo_data: z.string().optional(),
  prazo_hora: z.string().optional(),
});

export type CardFormInput = z.infer<typeof cardFormSchema>;
