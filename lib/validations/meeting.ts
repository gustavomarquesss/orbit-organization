import { z } from "zod";

export const meetingFieldsSchema = z.object({
  meeting_date: z.string().min(1, "Informe a data da reunião."),
  meeting_time: z.string().optional(),
  assuntos: z.string().trim().max(5000, "Assuntos muito longos.").optional(),
  participant_ids: z.array(z.string()),
});

export type MeetingFieldsInput = z.infer<typeof meetingFieldsSchema>;
