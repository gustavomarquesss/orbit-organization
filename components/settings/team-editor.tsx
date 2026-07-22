"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inviteTeamMember, toggleTeamMemberActive } from "@/lib/actions/team";

type Member = { id: string; full_name: string; email: string; is_active: boolean };

export function TeamEditor({ members }: { members: Member[] }) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleInvite() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await inviteTeamMember(email, fullName);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(`Convite enviado para ${email}.`);
      setEmail("");
      setFullName("");
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleTeamMemberActive(id, !current);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border p-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nome</label>
          <Input className="h-8 w-48" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Email</label>
          <Input className="h-8 w-56" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button size="sm" onClick={handleInvite} disabled={isPending} className="gap-1.5">
          <Plus className="size-4" />
          Convidar
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-500">{success}</p> : null}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-28">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{member.email}</TableCell>
                <TableCell>
                  <Button
                    variant={member.is_active ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleToggle(member.id, member.is_active)}
                    disabled={isPending}
                  >
                    {member.is_active ? "Ativo" : "Inativo"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
