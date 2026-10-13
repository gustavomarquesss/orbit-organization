import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CardQuickAddProvider } from "@/components/cards/card-quick-add-provider";
import { SearchProvider } from "@/components/search/search-provider";
import { createClient } from "@/lib/supabase/server";
import { getCardLookups } from "@/lib/queries/cards";
import { getAccess } from "@/lib/auth/session";
import { resolvePermissions } from "@/lib/auth/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [lookups, access, { data: member }] = await Promise.all([
    getCardLookups(),
    getAccess(),
    user
      ? supabase.from("team_members").select("full_name, avatar_url, avatar_color").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Sem sessão o proxy já redirecionou; o fallback só satisfaz o tipo.
  const navAccess = access ?? { isAdmin: false, permissions: resolvePermissions({}) };

  return (
    <SearchProvider>
      <CardQuickAddProvider lookups={lookups}>
        <div className="flex min-h-screen">
          <Sidebar access={navAccess} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar access={navAccess} email={user?.email ?? ""} member={member} />
            <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6">{children}</main>
          </div>
        </div>
        <MobileBottomNav access={navAccess} />
      </CardQuickAddProvider>
    </SearchProvider>
  );
}
