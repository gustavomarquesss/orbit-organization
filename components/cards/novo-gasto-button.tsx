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
  const [tipoAberto, setTipoAberto] = useState<"gasto" | "receita" | null>(null);
  const router = useRouter();

  function handleSuccess() {
    setTipoAberto(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setTipoAberto("receita")} className="gap-1.5">
          <Plus className="size-4" />
          Nova Receita
        </Button>
        <Button size="sm" onClick={() => setTipoAberto("gasto")} className="gap-1.5">
          <Plus className="size-4" />
          Novo Gasto
        </Button>
      </div>
      <FinanceiroFormDialog
        open={tipoAberto !== null}
        onOpenChange={(open) => setTipoAberto(open ? tipoAberto : null)}
        lookups={lookups}
        financeiroTypeId={financeiroTypeId}
        defaultTipo={tipoAberto ?? "gasto"}
        onSuccess={handleSuccess}
      />
    </>
  );
}
