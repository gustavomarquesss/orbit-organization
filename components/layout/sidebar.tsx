import { SidebarNav } from "./sidebar-nav";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 shrink-0 items-center px-4 text-sm font-semibold text-sidebar-foreground">
        Painel Interno
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <SidebarNav />
      </div>
    </aside>
  );
}
