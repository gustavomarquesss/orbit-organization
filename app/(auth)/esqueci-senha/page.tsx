import { LogoMark } from "@/components/brand/logo";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function EsqueciSenhaPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <LogoMark className="mx-auto size-8" />
        <h1 className="text-2xl font-semibold tracking-tight">Esqueceu sua senha?</h1>
        <p className="text-sm text-muted-foreground">
          Informe seu email e enviaremos um link para redefinir sua senha.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
