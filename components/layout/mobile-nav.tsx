"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu className="size-5" />
        <span className="sr-only">Abrir menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="px-4 pt-4">Painel Interno</SheetTitle>
        <div className="px-3 pb-4">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
