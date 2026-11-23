"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Columns3, LayoutGrid, List } from "lucide-react";

import { Button } from "@/components/ui/button";

type View = "board" | "grid" | "list";

// withBoard: só a aba Cards tem o quadro Kanban (padrão); Reuniões e Financeiro só têm grid e lista.
export function ViewToggle({ withBoard = false }: { withBoard?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const param = searchParams.get("view");
  const defaultView: View = withBoard ? "board" : "grid";
  const view: View = param === "list" ? "list" : param === "grid" ? "grid" : defaultView;

  function setView(next: View) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === defaultView) params.delete("view");
    else params.set("view", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  const options: { value: View; label: string; icon: typeof List }[] = [
    ...(withBoard ? [{ value: "board" as const, label: "Quadro", icon: Columns3 }] : []),
    { value: "grid", label: "Grid", icon: LayoutGrid },
    { value: "list", label: "Lista", icon: List },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-card/60 p-0.5">
      {options.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={view === value ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setView(value)}
          title={label}
          aria-pressed={view === value}
          className="gap-1.5"
        >
          <Icon className="size-4" />
          <span className={withBoard ? "hidden sm:inline" : "hidden"}>{label}</span>
        </Button>
      ))}
    </div>
  );
}
