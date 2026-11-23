"use client";

import { useState, useTransition } from "react";
import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TeamMemberAvatar } from "@/components/team/team-member-avatar";
import { addComment, deleteComment } from "@/lib/actions/card-extras";
import { formatRelative } from "@/lib/utils/dates";
import type { CommentData } from "@/lib/queries/card-extras";

export function CardComments({
  cardId,
  initial,
  currentUserId,
  isAdmin,
  me,
  available,
}: {
  cardId: string;
  initial: CommentData[];
  currentUserId: string;
  isAdmin: boolean;
  me: { full_name: string; avatar_color: string; avatar_url: string | null } | null;
  available: boolean;
}) {
  const [comments, setComments] = useState(initial);
  const [text, setText] = useState("");
  const [sending, startSending] = useTransition();

  if (!available) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Os comentários ainda não estão ativos no banco de dados. Aplique a migration{" "}
        <code className="font-mono text-xs">0017_checklists_comments_links_cover.sql</code> no Supabase.
      </p>
    );
  }

  function handleSend() {
    const body = text.trim();
    if (!body) return;
    startSending(async () => {
      const result = await addComment(cardId, body);
      if (result.error || !result.id) {
        toast.error(result.error ?? "Não foi possível comentar.");
        return;
      }
      setComments((prev) => [
        ...prev,
        {
          id: result.id as string,
          body,
          created_at: new Date().toISOString(),
          author: me ? { id: currentUserId, ...me } : null,
        },
      ]);
      setText("");
    });
  }

  function handleDelete(comment: CommentData) {
    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    deleteComment(comment.id).then((result) => {
      if (result.error) {
        toast.error(result.error);
        setComments(previous);
      }
    });
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          <MessageSquare className="size-6 text-primary/70" />
          Nenhum comentário ainda.
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const mine = comment.author?.id === currentUserId;
            return (
              <li key={comment.id} className="group flex gap-2.5">
                <TeamMemberAvatar
                  name={comment.author?.full_name ?? "?"}
                  avatarUrl={comment.author?.avatar_url}
                  avatarColor={comment.author?.avatar_color}
                  size="sm"
                />
                <div className="min-w-0 flex-1 rounded-xl border bg-card/60 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold">{comment.author?.full_name ?? "Usuário removido"}</span>
                    <span className="text-muted-foreground">{formatRelative(comment.created_at)}</span>
                    {mine || isAdmin ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="ml-auto md:opacity-0 md:group-hover:opacity-100"
                        onClick={() => handleDelete(comment)}
                        aria-label="Excluir comentário"
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{comment.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <Textarea
          rows={2}
          placeholder="Escreva um comentário... (Ctrl+Enter para enviar)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!text.trim() || sending} className="gap-1.5">
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Comentar
          </Button>
        </div>
      </form>
    </div>
  );
}
