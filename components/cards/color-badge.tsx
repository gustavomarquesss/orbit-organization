export function ColorBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ borderColor: `${color}40`, color, backgroundColor: `${color}1a` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
