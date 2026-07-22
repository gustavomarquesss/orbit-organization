import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { QuickAddCardButton } from "@/components/cards/quick-add-card-button";
import { SearchTriggerButton } from "@/components/search/search-trigger-button";
import { MobileNav } from "./mobile-nav";

export function Topbar({ email }: { email: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-6">
      <MobileNav />

      <SearchTriggerButton />

      <QuickAddCardButton />

      <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
        <span className="hidden sm:inline">{email}</span>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
