import { cn } from "@/lib/utils";

export function MultiSelectChips({
  options,
  value,
  onChange,
  showSelectAll = false,
  selectAllLabel = "Todos",
  clearAllLabel = "Limpar todos",
}: {
  options: { id: string; label: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  showSelectAll?: boolean;
  selectAllLabel?: string;
  clearAllLabel?: string;
}) {
  const allSelected = options.length > 0 && options.every((o) => value.includes(o.id));

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function toggleAll() {
    onChange(allSelected ? [] : options.map((o) => o.id));
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {showSelectAll && options.length > 0 ? (
        <button
          type="button"
          onClick={toggleAll}
          className={cn(
            "rounded-full border border-dashed px-2.5 py-1 text-xs transition-colors",
            allSelected
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          {allSelected ? clearAllLabel : selectAllLabel}
        </button>
      ) : null}
      {options.map((option) => {
        const active = value.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
