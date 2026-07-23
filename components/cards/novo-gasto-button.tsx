"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FinanceiroFormDialog } from "@/components/cards/financeiro-form-dialog";
import type { CardLookups } from "@/lib/queries/cards";

export function NovoGastoButton({
  lookups,
  financeiroTypeId,
}: {
  lookups: CardLookups;
  financeiroTypeId: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Novo Gasto
      </Button>
      <FinanceiroFormDialog
        open={open}
        onOpenChange={setOpen}
        lookups={lookups}
        financeiroTypeId={financeiroTypeId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
