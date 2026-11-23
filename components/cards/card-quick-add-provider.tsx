"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";

import { CardFormDialog } from "@/components/cards/card-form-dialog";
import type { CardLookups } from "@/lib/queries/cards";

const QuickAddContext = createContext<(() => void) | null>(null);
const QuickAddInStatusContext = createContext<((statusId: string) => void) | null>(null);

export function useQuickAddCard() {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAddCard deve ser usado dentro de CardQuickAddProvider.");
  return ctx;
}

// Abre o formulário de novo card já com o status escolhido (botão "+" no fim de cada coluna do quadro).
export function useQuickAddCardInStatus() {
  const ctx = useContext(QuickAddInStatusContext);
  if (!ctx) throw new Error("useQuickAddCardInStatus deve ser usado dentro de CardQuickAddProvider.");
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
  const [defaultStatusId, setDefaultStatusId] = useState<string | undefined>(undefined);
  const router = useRouter();
  const openCreate = useCallback(() => {
    setDefaultStatusId(undefined);
    setOpen(true);
  }, []);
  const openCreateInStatus = useCallback((statusId: string) => {
    setDefaultStatusId(statusId);
    setOpen(true);
  }, []);

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <QuickAddContext.Provider value={openCreate}>
      <QuickAddInStatusContext.Provider value={openCreateInStatus}>
        {children}
        <CardFormDialog
          open={open}
          onOpenChange={setOpen}
          lookups={lookups}
          defaultStatusId={defaultStatusId}
          onSuccess={handleSuccess}
        />
      </QuickAddInStatusContext.Provider>
    </QuickAddContext.Provider>
  );
}
