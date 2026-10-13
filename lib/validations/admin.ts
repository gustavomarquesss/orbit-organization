import { z } from "zod";

import { ALL_PERMISSION_KEYS, type PermissionKey } from "@/lib/auth/permissions";

const permissionsSchema = z.object(
  Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, z.boolean()])) as Record<
    PermissionKey,
    z.ZodBoolean
  >,
);

export const passwordSchema = z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").max(72, "Senha muito longa.");

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1, "Informe o nome.").max(120, "Nome muito longo."),
  email: z.string().trim().toLowerCase().email("Informe um email válido."),
  // Vazio = envia convite por email para a pessoa definir a própria senha.
  password: z.union([z.literal(""), passwordSchema]),
  permissions: permissionsSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, "Informe o nome.").max(120, "Nome muito longo."),
  email: z.string().trim().toLowerCase().email("Informe um email válido."),
  isActive: z.boolean(),
  permissions: permissionsSchema,
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
