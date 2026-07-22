"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { mainNavItems, settingsNavItems } from "./nav-items";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/configuracoes");

  return (
    <nav className="flex flex-col gap-1 py-2">
      {mainNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
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
        {settingsNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
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
