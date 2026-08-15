"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset, type ForgotPasswordState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  if (state?.success) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Se este email estiver cadastrado, você vai receber um link para redefinir a senha em
        instantes.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
