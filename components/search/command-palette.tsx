"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { searchCards, type SearchResult } from "@/lib/actions/search";
import { getCardTypeIcon } from "@/lib/utils/card-type-icons";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) return;

    const handle = setTimeout(() => {
      startTransition(async () => {
        const data = await searchCards(trimmed);
        setResults(data);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  function selectCard(id: string) {
    onOpenChange(false);
    setQuery("");
    router.push(`/cards/${id}`);
  }

  const visibleResults = query.trim() ? results : [];

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Busca global"
      description="Busque por título, descrição, tipo, modelo, responsável ou tag"
    >
      <Command shouldFilter={false}>
        <CommandInput placeholder="Buscar em todo o painel..." value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>
            {isPending ? "Buscando..." : query.trim() ? "Nenhum resultado." : "Digite para buscar cards, tipos, tags, modelos ou responsáveis."}
          </CommandEmpty>
          <CommandGroup heading="Cards">
            {visibleResults.map((result) => {
              const TypeIcon = getCardTypeIcon(result.typeKey);
              return (
                <CommandItem key={result.id} value={result.id} onSelect={() => selectCard(result.id)}>
                  <TypeIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{result.title}</span>
                  <span className="text-xs text-muted-foreground">{result.statusLabel}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
