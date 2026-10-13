import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth/session";
import { SimpleListEditor } from "@/components/settings/simple-list-editor";
import { createClient } from "@/lib/supabase/server";

export default async function TagsPage() {
  await requirePermission("configuracoes", "/configuracoes/notificacoes");
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("id, name").order("name");

  return (
    <>
      <PageHeader title="Tags" description="Gerencie as tags usadas para filtrar os cards." />
      <SimpleListEditor table="tags" items={data ?? []} hasActiveToggle={false} />
    </>
  );
}
