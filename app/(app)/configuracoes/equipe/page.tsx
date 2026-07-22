import { PageHeader } from "@/components/layout/page-header";
import { TeamEditor } from "@/components/settings/team-editor";
import { createClient } from "@/lib/supabase/server";

export default async function EquipePage() {
  const supabase = await createClient();
  const { data } = await supabase.from("team_members").select("id, full_name, email, is_active").order("full_name");

  return (
    <>
      <PageHeader title="Equipe" description="Convide novas pessoas e gerencie quem tem acesso ao painel." />
      <TeamEditor members={data ?? []} />
    </>
  );
}
