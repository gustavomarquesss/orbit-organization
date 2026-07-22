import { PageHeader } from "@/components/layout/page-header";
import { TypeLikeEditor } from "@/components/settings/type-like-editor";
import { createClient } from "@/lib/supabase/server";

export default async function TiposPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("card_types")
    .select("id, key, label, emoji, sort_order, is_active")
    .order("sort_order");

  return (
    <>
      <PageHeader
        title="Tipos de Card"
        description="Adicione novos tipos (ex.: Podcast) sem precisar mexer em código."
      />
      <TypeLikeEditor table="card_types" colorField="emoji" items={data ?? []} />
    </>
  );
}
