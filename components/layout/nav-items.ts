import { CalendarDays, LayoutDashboard, LayoutGrid, Wallet } from "lucide-react";

export const mainNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cards", label: "Cards", icon: LayoutGrid },
  { href: "/reunioes", label: "Reuniões", icon: CalendarDays },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
];

export const settingsNavItems = [
  { href: "/configuracoes/tipos", label: "Tipos de Card" },
  { href: "/configuracoes/status", label: "Status" },
  { href: "/configuracoes/prioridades", label: "Prioridades" },
  { href: "/configuracoes/modelos", label: "Modelos" },
  { href: "/configuracoes/equipe", label: "Equipe" },
  { href: "/configuracoes/tags", label: "Tags" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
