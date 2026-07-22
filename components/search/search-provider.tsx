"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { CommandPalette } from "./command-palette";

const SearchContext = createContext<(() => void) | null>(null);

export function useGlobalSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useGlobalSearch deve ser usado dentro de SearchProvider.");
  return ctx;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSearch = useCallback(() => setOpen(true), []);

  return (
    <SearchContext.Provider value={openSearch}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </SearchContext.Provider>
  );
}
