import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { formatCurrencyBRL } from "@/lib/utils/financeiro";
import { MetasDialog } from "@/components/financeiro/metas-dialog";
import type { FinanceiroMetas, FinanceiroSummary as FinanceiroSummaryData } from "@/lib/queries/financeiro";

function ProgressBar({ pct, tone }: { pct: number; tone: "red" | "green" }) {
  const width = Math.min(100, Math.max(0, pct));
  const color = tone === "red" ? (pct > 100 ? "bg-red-500" : "bg-primary/60") : "bg-emerald-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function GoalRow({
  label,
  atual,
  meta,
  tone,
}: {
  label: string;
  atual: number;
  meta: number;
  tone: "red" | "green";
}) {
  const pct = meta > 0 ? (atual / meta) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {formatCurrencyBRL(atual)}
          {meta > 0 ? <span className="text-muted-foreground"> / {formatCurrencyBRL(meta)}</span> : null}
        </span>
      </div>
      {meta > 0 ? <ProgressBar pct={pct} tone={tone} /> : <p className="text-xs text-muted-foreground">Meta não definida.</p>}
    </div>
  );
}

export function FinanceiroSummary({
  summary,
  metas,
}: {
  summary: FinanceiroSummaryData;
  metas: FinanceiroMetas;
}) {
  const lucroPositivo = summary.lucro >= 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
            <TrendingDown className="size-4.5 text-red-500" />
          </div>
          <div>
            <div className="text-xl font-semibold tabular-nums text-red-500">
              {formatCurrencyBRL(summary.totalGastos)}
            </div>
            <div className="text-xs text-muted-foreground">Total de Gastos</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
            <TrendingUp className="size-4.5 text-emerald-500" />
          </div>
          <div>
            <div className="text-xl font-semibold tabular-nums text-emerald-500">
              {formatCurrencyBRL(summary.totalReceitas)}
            </div>
            <div className="text-xs text-muted-foreground">Total de Receitas</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${lucroPositivo ? "bg-emerald-500/15" : "bg-red-500/15"}`}
          >
            <Wallet className={`size-4.5 ${lucroPositivo ? "text-emerald-500" : "text-red-500"}`} />
          </div>
          <div>
            <div className={`text-xl font-semibold tabular-nums ${lucroPositivo ? "text-emerald-500" : "text-red-500"}`}>
              {formatCurrencyBRL(summary.lucro)}
            </div>
            <div className="text-xs text-muted-foreground">Lucro (Receitas - Gastos)</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Metas do mês</h3>
          <MetasDialog metas={metas} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <GoalRow label="Gastos" atual={summary.gastosMesAtual} meta={metas.metaGastosMensal} tone="red" />
          <GoalRow label="Receita" atual={summary.receitasMesAtual} meta={metas.metaReceitaMensal} tone="green" />
        </div>
      </div>
    </div>
  );
}
