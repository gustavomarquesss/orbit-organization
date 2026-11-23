import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5", className)}
    >
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19.4" cy="8.2" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Logo({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-base font-bold tracking-tight", className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-md shadow-violet-500/30">
        <LogoMark className={cn("size-4", iconClassName)} />
      </span>
      <span className="text-gradient">Orbit</span>
    </span>
  );
}
