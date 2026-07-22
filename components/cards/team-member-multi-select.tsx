import { cn } from "@/lib/utils";

export function TeamMemberMultiSelect({
  teamMembers,
  value,
  onChange,
  showSelectAll = false,
}: {
  teamMembers: { id: string; full_name: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  showSelectAll?: boolean;
}) {
  const allSelected = teamMembers.length > 0 && teamMembers.every((m) => value.includes(m.id));

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function toggleAll() {
    onChange(allSelected ? [] : teamMembers.map((m) => m.id));
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {showSelectAll && teamMembers.length > 0 ? (
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
          {allSelected ? "Limpar todos" : "Todos"}
        </button>
      ) : null}
      {teamMembers.map((member) => {
        const active = value.includes(member.id);
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => toggle(member.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {member.full_name}
          </button>
        );
      })}
    </div>
  );
}
