import Link from "next/link";

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { QuickAddCardButton } from "@/components/cards/quick-add-card-button";
import { SearchTriggerButton } from "@/components/search/search-trigger-button";
import { TeamMemberAvatar } from "@/components/team/team-member-avatar";
import { MobileNav } from "./mobile-nav";

export function Topbar({
  email,
  member,
}: {
  email: string;
  member?: { full_name: string; avatar_url: string | null; avatar_color: string } | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-6">
      <MobileNav />

      <SearchTriggerButton />

      <QuickAddCardButton />

      <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
        <Link href="/perfil" className="flex items-center gap-2 hover:text-foreground">
          {member ? (
            <TeamMemberAvatar
              name={member.full_name}
              avatarUrl={member.avatar_url}
              avatarColor={member.avatar_color}
              size="sm"
            />
          ) : null}
          <span className="hidden sm:inline">{member?.full_name ?? email}</span>
        </Link>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
