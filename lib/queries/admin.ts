import { createServiceClient } from "@/lib/supabase/service";
import { isSuperAdminEmail, resolvePermissions, type PermissionKey } from "@/lib/auth/permissions";

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  avatarColor: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  permissions: Record<PermissionKey, boolean>;
  createdAt: string;
  lastSignInAt: string | null;
  // Convidado que ainda não aceitou o convite / definiu a senha.
  pending: boolean;
};

// Só chamar depois de confirmar que quem pediu é o admin (a página faz isso): usa a
// service role, que ignora RLS.
export async function getAdminUsers(): Promise<AdminUser[]> {
  const admin = createServiceClient();

  const [{ data: members }, authResult] = await Promise.all([
    admin
      .from("team_members")
      .select("id, full_name, email, avatar_url, avatar_color, is_active, permissions, created_at")
      .order("full_name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const authById = new Map((authResult.data?.users ?? []).map((u) => [u.id, u]));

  return (members ?? []).map((m) => {
    const authUser = authById.get(m.id);
    return {
      id: m.id,
      fullName: m.full_name,
      email: m.email,
      avatarUrl: m.avatar_url,
      avatarColor: m.avatar_color,
      isActive: m.is_active,
      isSuperAdmin: isSuperAdminEmail(m.email),
      permissions: resolvePermissions(m.permissions),
      createdAt: m.created_at,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
      pending: !!authUser && !authUser.last_sign_in_at,
    };
  });
}
