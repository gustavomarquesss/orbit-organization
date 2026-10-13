import { redirect } from "next/navigation";

import { can } from "@/lib/auth/permissions";
import { getAccess } from "@/lib/auth/session";

export default async function ConfiguracoesPage() {
  const access = await getAccess();
  redirect(access && can(access, "configuracoes") ? "/configuracoes/tipos" : "/configuracoes/notificacoes");
}
