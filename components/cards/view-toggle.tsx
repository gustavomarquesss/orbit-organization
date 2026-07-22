"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "list" ? "list" : "grid";

  function setView(next: "grid" | "list") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "grid") params.delete("view");
    else params.set("view", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
      <Button
        variant={view === "grid" ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => setView("grid")}
        title="Grid"
      >
        <LayoutGrid className="size-4" />
      </Button>
      <Button
        variant={view === "list" ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => setView("list")}
        title="Lista"
      >
        <List className="size-4" />
      </Button>
    </div>
  );
}
