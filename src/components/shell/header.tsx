"use client";

import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NAV_ITEMS } from "./nav-items";

function sectionTitle(pathname: string): string {
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? "Catalift";
}

export function Header() {
  const pathname = usePathname();

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex w-full max-w-screen-sm items-center justify-between px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">
            Catalift
          </span>
          <span className="text-base font-semibold tracking-tight">
            {sectionTitle(pathname)}
          </span>
        </div>
        <Avatar>
          <AvatarFallback>CA</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
