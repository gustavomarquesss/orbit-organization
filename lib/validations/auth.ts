import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Informe um email válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Informe um email válido."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
