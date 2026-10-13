import { CalendarDays, LayoutDashboard, LayoutGrid, ShieldCheck, User, Wallet } from "lucide-react";

import { can, type Access, type PermissionKey } from "@/lib/auth/permissions";

export type NavAccess = Pick<Access, "isAdmin" | "permissions">;

export const mainNavItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: PermissionKey | null;
}[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { href: "/cards", label: "Cards", icon: LayoutGrid, permission: "cards" },
  { href: "/reunioes", label: "Reuniões", icon: CalendarDays, permission: "reunioes" },
  { href: "/financeiro", label: "Financeiro", icon: Wallet, permission: "financeiro" },
  { href: "/perfil", label: "Perfil", icon: User, permission: null },
];

export const adminNavItem = { href: "/admin", label: "Admin", icon: ShieldCheck };

export const settingsNavItems: { href: string; label: string; permission: PermissionKey | null }[] = [
  { href: "/configuracoes/tipos", label: "Tipos de Card", permission: "configuracoes" },
  { href: "/configuracoes/status", label: "Status", permission: "configuracoes" },
  { href: "/configuracoes/prioridades", label: "Prioridades", permission: "configuracoes" },
  { href: "/configuracoes/modelos", label: "Modelos", permission: "configuracoes" },
  { href: "/configuracoes/tags", label: "Tags", permission: "configuracoes" },
  { href: "/configuracoes/notificacoes", label: "Notificações", permission: null },
];

// Só esconde o link; quem barra de verdade são as páginas e as Server Actions.
export function visibleNavItems<T extends { permission: PermissionKey | null }>(items: T[], access: NavAccess) {
  return items.filter((item) => !item.permission || can(access, item.permission));
}

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
