import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Painel Interno</h1>
        <p className="text-sm text-muted-foreground">Entre com sua conta da equipe</p>
      </div>
      <LoginForm />
    </div>
  );
}
