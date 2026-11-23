"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { adminNavItem, isActive, mainNavItems, settingsNavItems, visibleNavItems, type NavAccess } from "./nav-items";

export function SidebarNav({ access, onNavigate }: { access: NavAccess; onNavigate?: () => void }) {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/configuracoes");

  return (
    <nav className="flex flex-col gap-1 py-2">
      {[...visibleNavItems(mainNavItems, access), ...(access.isAdmin ? [adminNavItem] : [])].map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              active
                ? "bg-gradient-to-r from-primary/25 via-primary/10 to-transparent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:translate-x-0.5 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            )}
          >
            {active ? <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary" /> : null}
            <Icon className={cn("size-4 transition-transform group-hover:scale-110", item.tone)} />
            {item.label}
          </Link>
        );
      })}

      <div className="my-2 border-t border-sidebar-border" />

      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
          settingsActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70",
        )}
      >
        <Settings className="size-4" />
        Configurações
      </div>
      <div className="ml-[1.625rem] flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
        {visibleNavItems(settingsNavItems, access).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-primary/15 font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
