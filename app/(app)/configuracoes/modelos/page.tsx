import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth/session";
import { SimpleListEditor } from "@/components/settings/simple-list-editor";
import { createClient } from "@/lib/supabase/server";

export default async function ModelosPage() {
  await requirePermission("configuracoes", "/configuracoes/notificacoes");
  const supabase = await createClient();
  const { data } = await supabase.from("modelos").select("id, name, is_active").order("name");

  return (
    <>
      <PageHeader title="Modelos" description="Adicione ou desative modelos sem precisar mexer em código." />
      <SimpleListEditor table="modelos" items={data ?? []} hasActiveToggle />
    </>
  );
}
