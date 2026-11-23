"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addLink, deleteLink } from "@/lib/actions/card-extras";
import type { LinkData } from "@/lib/queries/card-extras";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function CardLinks({
  cardId,
  initial,
  canEdit,
  available,
}: {
  cardId: string;
  initial: LinkData[];
  canEdit: boolean;
  available: boolean;
}) {
  const [links, setLinks] = useState(initial);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [adding, startAdding] = useTransition();

  if (!available) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Os anexos ainda não estão ativos no banco de dados. Aplique a migration{" "}
        <code className="font-mono text-xs">0017_checklists_comments_links_cover.sql</code> no Supabase.
      </p>
    );
  }

  function handleAdd() {
    if (!url.trim()) return;
    startAdding(async () => {
      const result = await addLink(cardId, url, title);
      if (result.error || !result.link) {
        toast.error(result.error ?? "Não foi possível adicionar o link.");
        return;
      }
      setLinks((prev) => [...prev, result.link as LinkData]);
      setUrl("");
      setTitle("");
    });
  }

  function handleDelete(link: LinkData) {
    const previous = links;
    setLinks((prev) => prev.filter((l) => l.id !== link.id));
    deleteLink(link.id).then((result) => {
      if (result.error) {
        toast.error(result.error);
        setLinks(previous);
      }
    });
  }

  return (
    <div className="space-y-3">
      {links.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          <Link2 className="size-6 text-primary/70" />
          Nenhum link anexado.
          {canEdit ? <span className="text-xs">Guarde aqui pastas do Drive, referências e documentos.</span> : null}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {links.map((link) => (
            <li key={link.id} className="group flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Link2 className="size-4" />
              </span>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 hover:text-primary"
              >
                <span className="block truncate text-sm font-medium">{link.title || hostOf(link.url)}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{hostOf(link.url)}</span>
              </a>
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => handleDelete(link)}
                  aria-label="Remover link"
                >
                  <Trash2 className="text-destructive" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <form
          className="flex flex-col gap-2 rounded-xl border border-dashed p-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
        >
          <Input
            className="h-8 flex-1"
            placeholder="Cole o link (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Input
            className="h-8 sm:w-40"
            placeholder="Nome (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={!url.trim() || adding} className="gap-1.5">
            {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Anexar
          </Button>
        </form>
      ) : null}
    </div>
  );
}
