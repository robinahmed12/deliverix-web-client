"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCurrentUser } from "@/features/auth/queries";
import {
  screenNavGroups,
  screenNavItems,
  type NavItem,
} from "@/components/shared/nav-config";
import { SidebarNav, isActiveNavPath } from "@/components/shared/sidebar-nav";
import { NotificationBell } from "@/components/shared/notification-bell";
import { UserMenu } from "@/components/shared/user-menu";
import { SessionWatcher } from "@/components/shared/session-watcher";
import { cn } from "@/lib/utils/cn";

/** Brand tile + wordmark, shown in the sidebar and the mobile drawer. */
function BrandBlock({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className={cn(
        "flex h-14 shrink-0 items-center gap-2.5 border-b px-4",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
      >
        D
      </span>
      <span className="text-base font-semibold tracking-tight">Deliverix</span>
    </Link>
  );
}

/** Best-matching nav label for the current path, used as the top-bar title. */
function pageTitleForPath(navItems: NavItem[], pathname: string): string {
  let match: NavItem | undefined;
  for (const item of navItems) {
    if (
      isActiveNavPath(pathname, item.href) &&
      (!match || item.href.length > match.href.length)
    ) {
      match = item;
    }
  }
  return match?.label ?? "";
}

/**
 * Authenticated application shell (NAV-001..005).
 *
 * Navigation renders client-side so it reacts to the session's effective
 * permissions (RBAC-006) and the current path. Authorization data always
 * comes from the backend `/auth/me` result (RBAC-001).
 *
 * Below `md` the nav lives in an off-canvas sheet opened from the header
 * hamburger; from `md` up it is a static sidebar column. The breakpoint is
 * CSS-only, so the sheet is not mounted-visible on desktop. The sheet is
 * modal (page behind it is inert), so every drawer navigation goes through
 * a link carrying `onNavigate`, which closes it — Radix handles escape and
 * outside-press.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const [navOpen, setNavOpen] = React.useState(false);

  const sections = user ? screenNavGroups(user.permissions) : [];
  // Flat view of the same permission-filtered items, for the top-bar title.
  const flatItems = user ? screenNavItems(user.permissions) : [];
  const pageTitle = pageTitleForPath(flatItems, pathname);

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <SessionWatcher />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-background md:flex">
        <BrandBlock />
        <SidebarNav
          sections={sections}
          loading={user === undefined}
          pathname={pathname}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-card/80 px-4 backdrop-blur lg:px-6">
          {/* Mobile: hamburger + brand */}
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 size-9"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 gap-0 p-0 sm:max-w-72"
              >
                <SheetTitle className="sr-only">Primary navigation</SheetTitle>
                <BrandBlock onNavigate={() => setNavOpen(false)} />
                <SidebarNav
                  sections={sections}
                  loading={user === undefined}
                  pathname={pathname}
                  onNavigate={() => setNavOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <Link href="/dashboard" className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
              >
                D
              </span>
              <span className="text-base font-semibold tracking-tight">
                Deliverix
              </span>
            </Link>
          </div>

          {/* Desktop: contextual page title */}
          <h1 className="hidden text-sm font-semibold text-foreground md:block">
            {pageTitle || "Deliverix"}
          </h1>

          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
