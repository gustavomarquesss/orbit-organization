import { LogoMark } from "@/components/brand/logo";
import { ResetPasswordForm } from "./reset-password-form";

export default function RedefinirSenhaPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <LogoMark className="mx-auto size-8" />
        <h1 className="text-2xl font-semibold tracking-tight">Nova senha</h1>
        <p className="text-sm text-muted-foreground">Defina a nova senha da sua conta.</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
