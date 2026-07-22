import { PageHeader } from "@/components/layout/page-header";
import { SimpleListEditor } from "@/components/settings/simple-list-editor";
import { createClient } from "@/lib/supabase/server";

export default async function TagsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("id, name").order("name");

  return (
    <>
      <PageHeader title="Tags" description="Gerencie as tags usadas para filtrar os cards." />
      <SimpleListEditor table="tags" items={data ?? []} hasActiveToggle={false} />
    </>
  );
}
