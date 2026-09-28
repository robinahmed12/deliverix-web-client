"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/queries";
import {
  screenNavItems,
  SETTINGS_NAV,
  type NavItem,
} from "@/components/shared/nav-config";
import { NotificationBell } from "@/components/shared/notification-bell";
import { UserMenu } from "@/components/shared/user-menu";
import { SessionWatcher } from "@/components/shared/session-watcher";
import { cn } from "@/lib/utils/cn";

function isActivePath(pathname: string, href: string) {
  return (
    pathname === href ||
    pathname === `${href}/` ||
    pathname.startsWith(`${href}/`)
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}

/**
 * Brand block + primary navigation, shared by the desktop sidebar and the
 * mobile drawer so both render an identical, permission-filtered list
 * (NAV-001, NAV-003, RBAC-006).
 */
function SidebarContent({
  navItems,
  loading,
  pathname,
  onNavigate,
}: {
  navItems: NavItem[];
  loading: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="text-lg font-semibold tracking-tight"
        >
          Deliverix
        </Link>
      </div>
      <nav
        aria-label="Primary"
        className="flex-1 space-y-1 overflow-y-auto p-2"
      >
        {loading ? (
          <SidebarSkeleton />
        ) : (
          navItems.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActivePath(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))
        )}
      </nav>
    </div>
  );
}

/**
 * Authenticated application shell (NAV-001..005).
 *
 * Navigation is rendered client-side so it can react to the session's effective
 * permissions (RBAC-006) and the current path for active state. Data used for
 * authorization always comes from the backend `/auth/me` result (RBAC-001).
 *
 * Below the `md` breakpoint the sidebar is off-canvas and opened from the
 * header trigger; from `md` up it is a static column. The breakpoint is
 * CSS-only, so the sheet is not mounted-visible on desktop.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  // The sheet is modal, so the page behind it is inert: every navigation the
  // user can make while it is open goes through a link carrying `onNavigate`,
  // which closes it. Radix handles escape and outside-press.
  const [navOpen, setNavOpen] = React.useState(false);

  const navItems = user ? [...screenNavItems(user.permissions), SETTINGS_NAV] : [];

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <SessionWatcher />

      <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
        <SidebarContent
          navItems={navItems}
          loading={user === undefined}
          pathname={pathname}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b bg-card px-4 lg:px-6">
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
                <SheetTitle className="sr-only">
                  Primary navigation
                </SheetTitle>
                <SidebarContent
                  navItems={navItems}
                  loading={user === undefined}
                  pathname={pathname}
                  onNavigate={() => setNavOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <Link
              href="/dashboard"
              className="text-base font-semibold"
            >
              Deliverix
            </Link>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
