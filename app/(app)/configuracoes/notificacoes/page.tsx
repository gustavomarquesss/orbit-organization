import { PageHeader } from "@/components/layout/page-header";
import { NotificationSettings } from "@/components/settings/notification-settings";

export default function NotificacoesPage() {
  return (
    <>
      <PageHeader title="Notificações" description="Avisos de reuniões e prazos direto no seu aparelho." />
      <NotificationSettings />
    </>
  );
}
