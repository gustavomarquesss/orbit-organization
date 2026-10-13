import { PageHeader } from "@/components/layout/page-header";
import { UsersAdmin } from "@/components/admin/users-admin";
import { requireAdminPage } from "@/lib/auth/session";
import { getAdminUsers } from "@/lib/queries/admin";

export default async function AdminPage() {
  await requireAdminPage();
  const users = await getAdminUsers();

  return (
    <>
      <PageHeader
        title="Painel Admin"
        description="Crie usuários, redefina senhas e controle o que cada pessoa pode acessar."
      />
      <UsersAdmin users={users} />
    </>
  );
}
