"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getAccess } from "@/lib/auth/session";
import { isSuperAdminEmail, serializePermissions } from "@/lib/auth/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import {
  createUserSchema,
  passwordSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validations/admin";

export type AdminActionResult = { error?: string };

// Banir no Auth impede novos logins e a renovação da sessão de quem foi desativado.
const BAN_FOREVER = "876000h";

// Toda action deste arquivo passa por aqui: Server Action é endpoint público, então a
// checagem tem que ser feita a cada chamada, não só escondendo o botão na tela.
async function requireAdmin(): Promise<{ error: string } | { error?: undefined; actorId: string }> {
  const access = await getAccess();
  if (!access) return { error: "Sessão expirada. Entre novamente." };
  if (!access.isAdmin) return { error: "Apenas o administrador pode fazer isso." };
  return { actorId: access.userId };
}

async function getOrigin() {
  const headersList = await headers();
  return headersList.get("origin") ?? `https://${headersList.get("host")}`;
}

function authErrorMessage(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  if (/already (been )?registered|already exists/i.test(message)) return "Já existe um usuário com esse email.";
  if (/password/i.test(message)) return "A senha não foi aceita. Tente uma mais forte.";
  if (/rate limit/i.test(message)) return "Limite de emails do Supabase atingido. Tente de novo em alguns minutos.";
  return fallback;
}

function revalidateAll() {
  revalidatePath("/admin");
  // Nome/foto/permissões aparecem em quase todas as telas.
  revalidatePath("/", "layout");
}

export async function createUser(input: CreateUserInput): Promise<AdminActionResult & { id?: string }> {
  const guard = await requireAdmin();
  if (guard.error) return { error: guard.error };

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { fullName, email, password, permissions } = parsed.data;

  const admin = createServiceClient();
  let userId: string | undefined;

  if (password) {
    // Cria já confirmado e com senha definida por você — a pessoa entra direto.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) return { error: authErrorMessage(error?.message, "Não foi possível criar o usuário.") };
    userId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${await getOrigin()}/redefinir-senha`,
    });
    if (error || !data.user) return { error: authErrorMessage(error?.message, "Não foi possível enviar o convite.") };
    userId = data.user.id;
  }

  // O trigger handle_new_user já criou a linha em team_members; aqui só completamos.
  const { error: memberError } = await admin
    .from("team_members")
    .update({ full_name: fullName, permissions: serializePermissions(permissions) })
    .eq("id", userId);
  if (memberError) return { error: "Usuário criado, mas não foi possível salvar as permissões. Edite-o na lista." };

  revalidateAll();
  return { id: userId };
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<AdminActionResult> {
  const guard = await requireAdmin();
  if (guard.error) return { error: guard.error };

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { fullName, email, isActive, permissions } = parsed.data;

  const admin = createServiceClient();
  const { data: current, error: fetchError } = await admin
    .from("team_members")
    .select("email")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !current) return { error: "Usuário não encontrado." };

  const isSuperAdmin = isSuperAdminEmail(current.email);
  if (isSuperAdmin && !isActive) return { error: "A conta de administrador não pode ser desativada." };
  if (isSuperAdmin && email !== current.email) {
    return { error: "O email do administrador não pode ser alterado por aqui." };
  }

  const emailChanged = email !== current.email;
  const { error: authError } = await admin.auth.admin.updateUserById(id, {
    ...(emailChanged ? { email, email_confirm: true } : {}),
    user_metadata: { full_name: fullName },
    ban_duration: isActive ? "none" : BAN_FOREVER,
  });
  if (authError) return { error: authErrorMessage(authError.message, "Não foi possível atualizar o usuário.") };

  const { error } = await admin
    .from("team_members")
    .update({
      full_name: fullName,
      email,
      is_active: isActive,
      permissions: serializePermissions(permissions),
    })
    .eq("id", id);
  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidateAll();
  return {};
}

export async function setUserPassword(id: string, password: string): Promise<AdminActionResult> {
  const guard = await requireAdmin();
  if (guard.error) return { error: guard.error };

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Senha inválida." };

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password: parsed.data });
  if (error) return { error: authErrorMessage(error.message, "Não foi possível definir a senha.") };

  return {};
}

async function getMemberEmail(id: string) {
  const admin = createServiceClient();
  const { data } = await admin.from("team_members").select("email").eq("id", id).maybeSingle();
  return data?.email ?? null;
}

// Envia o email "redefinir senha" para o usuário. Cliente plain (fluxo implícito) porque o
// link precisa funcionar no aparelho da pessoa — o fluxo PKCE do cliente SSR depende de um
// cookie que só existe no navegador de quem pediu o reset.
export async function sendPasswordResetEmail(id: string): Promise<AdminActionResult> {
  const guard = await requireAdmin();
  if (guard.error) return { error: guard.error };

  const email = await getMemberEmail(id);
  if (!email) return { error: "Usuário não encontrado." };

  const plain = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await plain.auth.resetPasswordForEmail(email, { redirectTo: `${await getOrigin()}/redefinir-senha` });
  if (error) return { error: authErrorMessage(error.message, "Não foi possível enviar o email de redefinição.") };

  return {};
}

// Gera o link de recuperação sem enviar email — útil quando o limite de envio do Supabase
// estourou ou o email não chega: você copia e manda por WhatsApp.
export async function generateRecoveryLink(id: string): Promise<AdminActionResult & { link?: string }> {
  const guard = await requireAdmin();
  if (guard.error) return { error: guard.error };

  const email = await getMemberEmail(id);
  if (!email) return { error: "Usuário não encontrado." };

  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${await getOrigin()}/redefinir-senha` },
  });
  if (error || !data.properties?.action_link) return { error: "Não foi possível gerar o link." };

  return { link: data.properties.action_link };
}
