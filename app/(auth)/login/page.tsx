import { LogoMark } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <LogoMark className="mx-auto size-8" />
        <h1 className="text-2xl font-semibold tracking-tight">Orbit</h1>
        <p className="text-sm text-muted-foreground">Entre com sua conta da equipe</p>
      </div>
      <LoginForm />
    </div>
  );
}
