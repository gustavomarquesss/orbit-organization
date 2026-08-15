"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { updatePasswordSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "checking" | "ready" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus("ready");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    const formData = new FormData(event.currentTarget);
    const parsed = updatePasswordSchema.safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setIsPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    setIsPending(false);

    if (updateError) {
      setError("Não foi possível atualizar a senha. Solicite um novo link.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (status === "checking") {
    return <p className="text-center text-sm text-muted-foreground">Verificando link...</p>;
  }

  if (status === "invalid") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Este link é inválido ou expirou. Solicite um novo em{" "}
        <a href="/esqueci-senha" className="underline underline-offset-4">
          esqueci minha senha
        </a>
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
