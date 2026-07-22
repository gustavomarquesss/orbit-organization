import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TONE_STYLES = {
  yellow: {
    iconWrap: "bg-amber-500/15",
    icon: "text-amber-500",
    value: "text-amber-500",
  },
  green: {
    iconWrap: "bg-emerald-500/15",
    icon: "text-emerald-500",
    value: "text-emerald-500",
  },
  red: {
    iconWrap: "bg-red-500/15",
    icon: "text-red-500",
    value: "text-red-500",
  },
} as const;

export function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "yellow" | "green" | "red";
  href?: string;
}) {
  const active = tone && value > 0 ? TONE_STYLES[tone] : null;

  const content = (
    <>
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          active ? active.iconWrap : "bg-muted",
        )}
      >
        <Icon className={cn("size-4.5", active ? active.icon : "text-muted-foreground")} />
      </div>
      <div>
        <div className={cn("text-2xl font-semibold tabular-nums", active?.value)}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-3 rounded-xl border bg-card p-4">{content}</div>;
}
