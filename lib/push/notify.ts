import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

// Envia para todos os aparelhos inscritos de uma pessoa. Inscrições que o
// navegador já revogou (410/404) são removidas para não tentar de novo.
export async function sendPushToMember(
  supabase: SupabaseClient,
  teamMemberId: string,
  payload: PushPayload,
): Promise<{ sent: number }> {
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("team_member_id", teamMemberId);

  if (!subscriptions || subscriptions.length === 0) return { sent: 0 };

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          // "high" pede entrega imediata ao serviço de push (no iOS, sem isso
          // a Apple pode agrupar/atrasar o push para economizar bateria).
          { urgency: "high", TTL: 3600 },
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );

  return { sent };
}
