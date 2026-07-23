"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { savePushSubscription, deletePushSubscription } from "@/lib/actions/push";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "checking" | "idle" | "loading" | "subscribed" | "denied" | "unsupported";

export function NotificationSettings() {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker.getRegistration().then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      setStatus(subscription ? "subscribed" : "idle");
    });
  }, []);

  async function handleSubscribe() {
    setStatus("loading");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError("Chave pública de notificação não configurada.");
        setStatus("idle");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      const result = await savePushSubscription({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      if (result.error) {
        setError(result.error);
        setStatus("idle");
        return;
      }
      setStatus("subscribed");
    } catch {
      setError("Não foi possível ativar as notificações neste navegador.");
      setStatus("idle");
    }
  }

  async function handleUnsubscribe() {
    setStatus("loading");
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await deletePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setStatus("idle");
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Este navegador não suporta notificações push. No iPhone, adicione o Orbit à Tela de Início (Compartilhar →
        Adicionar à Tela de Início) e abra por lá antes de ativar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Receba avisos de reuniões marcadas e prazos de cards direto no seu aparelho.
      </p>
      {status === "subscribed" ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-green-500">Notificações ativadas neste aparelho.</span>
          <Button variant="outline" size="sm" onClick={handleUnsubscribe}>
            Desativar
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={handleSubscribe} disabled={status === "loading" || status === "checking"}>
          {status === "loading" ? "Ativando..." : "Ativar notificações"}
        </Button>
      )}
      {status === "denied" ? (
        <p className="text-xs text-destructive">
          Permissão negada. Habilite notificações para este site nas configurações do navegador/aparelho e tente de
          novo.
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
