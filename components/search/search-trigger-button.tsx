"use client";

import { Search } from "lucide-react";

import { useGlobalSearch } from "./search-provider";

export function SearchTriggerButton() {
  const openSearch = useGlobalSearch();

  return (
    <button
      type="button"
      onClick={openSearch}
      className="flex h-8 max-w-sm flex-1 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
    >
      <Search className="size-4" />
      Buscar...
      <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
        ⌘K
      </kbd>
    </button>
  );
}
