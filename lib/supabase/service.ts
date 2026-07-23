import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

// Cliente com a service role key: ignora RLS. Uso restrito a rotinas de
// servidor sem sessão de usuário (ex.: o cron de notificações), nunca
// exposto a código que roda no navegador.
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
