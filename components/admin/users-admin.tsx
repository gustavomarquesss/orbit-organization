"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, Link2, Mail, Pencil, Plus, Shuffle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamMemberAvatar } from "@/components/team/team-member-avatar";
import { allPermissions, PermissionsEditor } from "@/components/admin/permissions-editor";
import {
  createUser,
  generateRecoveryLink,
  sendPasswordResetEmail,
  setUserPassword,
  updateUser,
} from "@/lib/actions/admin";
import { ALL_PERMISSION_KEYS, type PermissionKey } from "@/lib/auth/permissions";
import type { AdminUser } from "@/lib/queries/admin";

type PermissionValues = Record<PermissionKey, boolean>;

function generatePassword() {
  // Sem caracteres ambíguos (0/O, 1/l/I) para ser fácil de ditar ou digitar.
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Não foi possível copiar. Selecione e copie manualmente.");
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function UsersAdmin({ users }: { users: AdminUser[] }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = users.find((u) => u.id === editingId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {users.length} {users.length === 1 ? "usuário" : "usuários"}
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Novo usuário
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="hidden md:table-cell">Permissões</TableHead>
              <TableHead className="hidden lg:table-cell">Último acesso</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const granted = ALL_PERMISSION_KEYS.filter((key) => user.permissions[key]).length;
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <TeamMemberAvatar
                        name={user.fullName}
                        avatarUrl={user.avatarUrl}
                        avatarColor={user.avatarColor}
                        size="sm"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{user.fullName}</span>
                        <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {user.isSuperAdmin ? <Badge>Admin</Badge> : null}
                      <Badge variant={user.isActive ? "secondary" : "destructive"}>
                        {user.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      {user.pending ? <Badge variant="outline">Convite pendente</Badge> : null}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {user.isSuperAdmin ? "Acesso total" : `${granted} de ${ALL_PERMISSION_KEYS.length} liberadas`}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatDate(user.lastSignInAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditingId(user.id)}>
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {creating ? <CreateUserForm onDone={() => setCreating(false)} /> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {editing ? <EditUserForm key={editing.id} user={editing} onDone={() => setEditingId(null)} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<PermissionValues>(allPermissions(true));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createUser({ fullName, email, password, permissions });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(password ? `Usuário ${email} criado.` : `Convite enviado para ${email}.`);
      onDone();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Novo usuário</DialogTitle>
        <DialogDescription>
          Defina uma senha para a pessoa entrar direto, ou deixe em branco para enviar um convite por email.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-name">Nome</Label>
          <Input id="new-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-email">Email</Label>
          <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">Senha (opcional)</Label>
          <PasswordField id="new-password" value={password} onChange={setPassword} />
        </div>
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-sm font-medium">Permissões</p>
          <PermissionsEditor value={permissions} onChange={setPermissions} disabled={isPending} />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone} disabled={isPending}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={isPending || !fullName.trim() || !email.trim()}>
          {password ? "Criar usuário" : "Enviar convite"}
        </Button>
      </div>
    </>
  );
}

function EditUserForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [isActive, setIsActive] = useState(user.isActive);
  const [permissions, setPermissions] = useState<PermissionValues>(user.permissions);
  const [error, setError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateUser(user.id, { fullName, email, isActive, permissions });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Usuário atualizado.");
      onDone();
    });
  }

  function handleSetPassword() {
    setPasswordMessage(null);
    startTransition(async () => {
      const result = await setUserPassword(user.id, newPassword);
      if (result.error) {
        setPasswordMessage({ ok: false, text: result.error });
        return;
      }
      setPasswordMessage({ ok: true, text: "Senha alterada. Passe a nova senha para a pessoa." });
    });
  }

  function handleSendEmail() {
    setPasswordMessage(null);
    startTransition(async () => {
      const result = await sendPasswordResetEmail(user.id);
      setPasswordMessage(
        result.error ? { ok: false, text: result.error } : { ok: true, text: `Email de redefinição enviado para ${user.email}.` },
      );
    });
  }

  function handleGenerateLink() {
    setPasswordMessage(null);
    startTransition(async () => {
      const result = await generateRecoveryLink(user.id);
      if (result.error || !result.link) {
        setPasswordMessage({ ok: false, text: result.error ?? "Não foi possível gerar o link." });
        return;
      }
      setRecoveryLink(result.link);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {user.fullName}
          {user.isSuperAdmin ? <Badge>Admin</Badge> : null}
        </DialogTitle>
        <DialogDescription>Criado em {formatDate(user.createdAt)}</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-name">Nome</Label>
          <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-email">Email</Label>
          <Input
            id="edit-email"
            type="email"
            value={email}
            disabled={user.isSuperAdmin}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="edit-active"
            className="mt-0.5"
            checked={isActive}
            disabled={user.isSuperAdmin}
            onCheckedChange={(checked) => setIsActive(checked === true)}
          />
          <Label htmlFor="edit-active" className="flex-col items-start gap-0.5 leading-snug">
            <span>Conta ativa</span>
            <span className="text-xs font-normal text-muted-foreground">
              Desativar impede o login e tira a pessoa das listas de responsáveis.
            </span>
          </Label>
        </div>
      </div>

      <div className="space-y-1.5 border-t pt-3">
        <p className="text-sm font-medium">Permissões</p>
        {user.isSuperAdmin ? (
          <p className="text-sm text-muted-foreground">O administrador sempre tem acesso total.</p>
        ) : (
          <PermissionsEditor value={permissions} onChange={setPermissions} disabled={isPending} />
        )}
      </div>

      <div className="space-y-2.5 border-t pt-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <KeyRound className="size-4" />
          Senha
        </p>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <PasswordField value={newPassword} onChange={setNewPassword} placeholder="Nova senha" />
          </div>
          <Button variant="secondary" onClick={handleSetPassword} disabled={isPending || newPassword.length < 6}>
            Definir
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSendEmail} disabled={isPending}>
            <Mail className="size-3.5" />
            Enviar email de reset
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerateLink} disabled={isPending}>
            <Link2 className="size-3.5" />
            Gerar link de reset
          </Button>
        </div>
        {recoveryLink ? (
          <div className="flex gap-2">
            <Input readOnly value={recoveryLink} onFocus={(e) => e.currentTarget.select()} />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyText(recoveryLink, "Link copiado.")}
              aria-label="Copiar link"
            >
              <Copy className="size-4" />
            </Button>
          </div>
        ) : null}
        {passwordMessage ? (
          <p className={passwordMessage.ok ? "text-sm text-emerald-500" : "text-sm text-destructive"}>
            {passwordMessage.text}
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" onClick={onDone} disabled={isPending}>
          Fechar
        </Button>
        <Button onClick={handleSave} disabled={isPending || !fullName.trim() || !email.trim()}>
          Salvar alterações
        </Button>
      </div>
    </>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      <Button type="button" variant="outline" size="icon" aria-label="Gerar senha" onClick={() => onChange(generatePassword())}>
        <Shuffle className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Copiar senha"
        disabled={!value}
        onClick={() => copyText(value, "Senha copiada.")}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}
