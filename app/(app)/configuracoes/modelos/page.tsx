import { PageHeader } from "@/components/layout/page-header";
import { SimpleListEditor } from "@/components/settings/simple-list-editor";
import { createClient } from "@/lib/supabase/server";

export default async function ModelosPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("modelos").select("id, name, is_active").order("name");

  return (
    <>
      <PageHeader title="Modelos" description="Adicione ou desative modelos sem precisar mexer em código." />
      <SimpleListEditor table="modelos" items={data ?? []} hasActiveToggle />
    </>
  );
}
