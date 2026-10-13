import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  can,
  isSuperAdminEmail,
  resolvePermissions,
  type Access,
  type PermissionKey,
} from "@/lib/auth/permissions";

// Resolve quem está logado e o que pode fazer. `cache` deduplica dentro da mesma
// requisição (layout + página + actions chamam sem custo extra).
export const getAccess = cache(async (): Promise<Access | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Exige email confirmado: o admin é reconhecido pelo email, então ele precisa ser verificado.
  const isAdmin = isSuperAdminEmail(user.email) && !!user.email_confirmed_at;
  const { data: member } = await supabase.from("team_members").select("permissions").eq("id", user.id).maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? "",
    isAdmin,
    permissions: resolvePermissions(member?.permissions),
  };
});

// Páginas na ordem em que tentamos mandar quem perdeu acesso. /perfil é sempre liberado.
const FALLBACK_ROUTES: { href: string; permission: PermissionKey | null }[] = [
  { href: "/", permission: "dashboard" },
  { href: "/cards", permission: "cards" },
  { href: "/reunioes", permission: "reunioes" },
  { href: "/financeiro", permission: "financeiro" },
  { href: "/perfil", permission: null },
];

function firstAllowedPath(access: Access, excluding: PermissionKey) {
  const route = FALLBACK_ROUTES.find((r) => r.permission !== excluding && (!r.permission || can(access, r.permission)));
  return route?.href ?? "/perfil";
}

// Para páginas (Server Components): sem sessão vai pro login; sem permissão vai pra
// primeira área que a pessoa pode ver.
export async function requirePermission(key: PermissionKey, fallbackPath?: string): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect("/login");
  if (!can(access, key)) redirect(fallbackPath ?? firstAllowedPath(access, key));
  return access;
}

export async function requireAdminPage(): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect("/login");
  if (!access.isAdmin) redirect("/");
  return access;
}

// Para Server Actions: devolve a mensagem de erro (ou null se liberado). Action é
// endpoint público, então a checagem aqui é a que realmente vale.
export async function checkPermission(...keys: PermissionKey[]): Promise<string | null> {
  const access = await getAccess();
  if (!access) return "Sessão expirada. Entre novamente.";
  if (!keys.some((key) => can(access, key))) return "Você não tem permissão para fazer isso.";
  return null;
}
