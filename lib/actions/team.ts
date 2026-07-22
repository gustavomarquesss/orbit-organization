"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function inviteTeamMember(email: string, fullName: string): Promise<{ error?: string }> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) return { error: "Informe um email." };

  const admin = getAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
    data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
  });

  if (error) return { error: "Não foi possível convidar essa pessoa." };

  revalidatePath("/configuracoes/equipe");
  return {};
}

export async function toggleTeamMemberActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const admin = getAdminClient();
  const { error } = await admin.from("team_members").update({ is_active: isActive }).eq("id", id);

  if (error) return { error: "Não foi possível atualizar." };

  revalidatePath("/configuracoes/equipe");
  return {};
}
