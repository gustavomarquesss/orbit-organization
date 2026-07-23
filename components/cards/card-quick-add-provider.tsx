"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";

import { CardFormDialog } from "@/components/cards/card-form-dialog";
import type { CardLookups } from "@/lib/queries/cards";

export type QuickAddOptions = { lockedCardTypeId?: string; title?: string };

const QuickAddContext = createContext<((options?: QuickAddOptions) => void) | null>(null);

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
  const [options, setOptions] = useState<QuickAddOptions>({});
  const router = useRouter();
  const openCreate = useCallback((opts?: QuickAddOptions) => {
    setOptions(opts ?? {});
    setOpen(true);
  }, []);

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <QuickAddContext.Provider value={openCreate}>
      {children}
      <CardFormDialog
        open={open}
        onOpenChange={setOpen}
        lookups={lookups}
        onSuccess={handleSuccess}
        lockedCardTypeId={options.lockedCardTypeId}
        title={options.title}
      />
    </QuickAddContext.Provider>
  );
}
