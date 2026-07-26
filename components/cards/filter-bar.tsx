"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterSelect } from "@/components/cards/filter-select";
import type { CardLookups } from "@/lib/queries/cards";

const FILTER_KEYS = [
  "tipo",
  "status",
  "prioridade",
  "responsavel",
  "modelo",
  "tag",
  "de",
  "ate",
  "pendente",
  "concluidos",
];

export function FilterBar({ lookups }: { lookups: CardLookups }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasActiveFilters = FILTER_KEYS.some((key) => searchParams.get(key));

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of FILTER_KEYS) params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {searchParams.get("pendente") === "1" ? (
        <Button variant="secondary" size="sm" onClick={() => setParam("pendente", "")} className="gap-1.5">
          Pendentes
          <X className="size-3.5" />
        </Button>
      ) : null}
      <FilterSelect
        value={searchParams.get("tipo") ?? ""}
        onChange={(v) => setParam("tipo", v)}
        placeholder="Tipo"
        options={lookups.cardTypes.map((t) => ({ id: t.id, label: t.label }))}
      />
      <FilterSelect
        value={searchParams.get("status") ?? ""}
        onChange={(v) => setParam("status", v)}
        placeholder="Status"
        options={lookups.statuses.map((s) => ({ id: s.id, label: s.label }))}
      />
      <FilterSelect
        value={searchParams.get("prioridade") ?? ""}
        onChange={(v) => setParam("prioridade", v)}
        placeholder="Prioridade"
        options={lookups.priorities.map((p) => ({ id: p.id, label: p.label }))}
      />
      <FilterSelect
        value={searchParams.get("responsavel") ?? ""}
        onChange={(v) => setParam("responsavel", v)}
        placeholder="Responsável"
        options={lookups.teamMembers.map((m) => ({ id: m.id, label: m.full_name }))}
      />
      <FilterSelect
        value={searchParams.get("modelo") ?? ""}
        onChange={(v) => setParam("modelo", v)}
        placeholder="Modelo"
        options={lookups.modelos.map((m) => ({ id: m.id, label: m.name }))}
      />
      <FilterSelect
        value={searchParams.get("tag") ?? ""}
        onChange={(v) => setParam("tag", v)}
        placeholder="Tag"
        options={lookups.tags.map((t) => ({ id: t.id, label: t.name }))}
      />

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          className="h-8 w-[9.5rem]"
          value={searchParams.get("de") ?? ""}
          onChange={(e) => setParam("de", e.target.value)}
        />
        <span className="text-xs text-muted-foreground">até</span>
        <Input
          type="date"
          className="h-8 w-[9.5rem]"
          value={searchParams.get("ate") ?? ""}
          onChange={(e) => setParam("ate", e.target.value)}
        />
      </div>

      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Checkbox
          checked={searchParams.get("concluidos") === "1"}
          onCheckedChange={(checked) => setParam("concluidos", checked ? "1" : "")}
        />
        Cards concluídos
      </label>

      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5">
          <X className="size-3.5" />
          Limpar filtros
        </Button>
      ) : null}
    </div>
  );
}
