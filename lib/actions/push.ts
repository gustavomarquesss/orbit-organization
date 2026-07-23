"use server";

import { createClient } from "@/lib/supabase/server";

export type PushActionResult = { error?: string };

export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<PushActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      team_member_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { error: "Não foi possível salvar a inscrição de notificação." };
  return {};
}

export async function deletePushSubscription(endpoint: string): Promise<PushActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { error: "Não foi possível remover a inscrição." };
  return {};
}
