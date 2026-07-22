"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";

import { CardFormDialog } from "@/components/cards/card-form-dialog";
import type { CardLookups } from "@/lib/queries/cards";

const QuickAddContext = createContext<(() => void) | null>(null);

export function useQuickAddCard() {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAddCard deve ser usado dentro de CardQuickAddProvider.");
  return ctx;
}

export function CardQuickAddProvider({
  lookups,
  children,
}: {
  lookups: CardLookups;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const openCreate = useCallback(() => setOpen(true), []);

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <QuickAddContext.Provider value={openCreate}>
      {children}
      <CardFormDialog open={open} onOpenChange={setOpen} lookups={lookups} onSuccess={handleSuccess} />
    </QuickAddContext.Provider>
  );
}
