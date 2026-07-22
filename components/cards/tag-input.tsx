"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createTag } from "@/lib/actions/tags";
import { cn } from "@/lib/utils";

export type TagOption = { id: string; name: string };

export function TagInput({
  options,
  value,
  onChange,
  onOptionsChange,
}: {
  options: TagOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  onOptionsChange: (options: TagOption[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const selected = options.filter((o) => value.includes(o.id));
  const trimmedQuery = query.trim();
  const hasExactMatch = options.some((o) => o.name.toLowerCase() === trimmedQuery.toLowerCase());

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function handleCreate() {
    if (!trimmedQuery) return;
    startTransition(async () => {
      const result = await createTag(trimmedQuery);
      if (result.data) {
        onOptionsChange([...options, result.data]);
        onChange([...value, result.data.id]);
        setQuery("");
      }
    });
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
              {tag.name}
              <button
                type="button"
                onClick={() => toggle(tag.id)}
                className="rounded-full p-0.5 hover:bg-foreground/10"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<Button type="button" variant="outline" size="sm" className="justify-between gap-2" />}
        >
          Adicionar tag
          <ChevronsUpDown className="size-3.5 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar ou criar tag..." value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
              <CommandGroup>
                {options.map((tag) => (
                  <CommandItem key={tag.id} value={tag.name} onSelect={() => toggle(tag.id)}>
                    <Check className={cn("size-4", value.includes(tag.id) ? "opacity-100" : "opacity-0")} />
                    {tag.name}
                  </CommandItem>
                ))}
                {trimmedQuery && !hasExactMatch ? (
                  <CommandItem value={`__create__${trimmedQuery}`} onSelect={handleCreate} disabled={isPending}>
                    <Plus className="size-3.5" />
                    Criar &quot;{trimmedQuery}&quot;
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
