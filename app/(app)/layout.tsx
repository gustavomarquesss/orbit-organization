import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CardQuickAddProvider } from "@/components/cards/card-quick-add-provider";
import { SearchProvider } from "@/components/search/search-provider";
import { createClient } from "@/lib/supabase/server";
import { getCardLookups } from "@/lib/queries/cards";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lookups = await getCardLookups();

  return (
    <SearchProvider>
      <CardQuickAddProvider lookups={lookups}>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar email={user?.email ?? ""} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
          </div>
        </div>
      </CardQuickAddProvider>
    </SearchProvider>
  );
}
