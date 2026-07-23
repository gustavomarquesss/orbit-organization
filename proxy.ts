import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // api/notifications/check é chamado pelo pg_cron com um Bearer token próprio
  // (NOTIFICATIONS_CRON_SECRET), nunca com sessão de usuário — não deve ser
  // redirecionado para /login.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/notifications|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
