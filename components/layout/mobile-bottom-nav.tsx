"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { isActive, mainNavItems } from "./nav-items";

const bottomNavItems = [
  ...mainNavItems,
  { href: "/configuracoes", label: "Config.", icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden">
      {bottomNavItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/configuracoes" ? pathname.startsWith("/configuracoes") : isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60",
            )}
          >
            <Icon className={cn("size-5", active && "text-sidebar-accent-foreground")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
