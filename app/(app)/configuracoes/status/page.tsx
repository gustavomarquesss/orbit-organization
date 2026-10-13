import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth/session";
import { TypeLikeEditor } from "@/components/settings/type-like-editor";
import { createClient } from "@/lib/supabase/server";

export default async function StatusPage() {
  await requirePermission("configuracoes", "/configuracoes/notificacoes");
  const supabase = await createClient();
  const { data } = await supabase
    .from("statuses")
    .select("id, key, label, color, sort_order, is_active")
    .order("sort_order");

  return (
    <>
      <PageHeader title="Status" description="Gerencie os status disponíveis e suas cores." />
      <TypeLikeEditor table="statuses" colorField="color" items={data ?? []} />
    </>
  );
}
