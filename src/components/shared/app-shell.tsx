"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/queries";
import { screenNavItems, SETTINGS_NAV } from "@/components/shared/nav-config";
import { NotificationBell } from "@/components/shared/notification-bell";
import { UserMenu } from "@/components/shared/user-menu";
import { SessionWatcher } from "@/components/shared/session-watcher";
import { cn } from "@/lib/utils/cn";

function SidebarLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground",
      )}
    >
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
 * Authenticated application shell (NAV-001..005).
 *
 * Navigation is rendered client-side so it can react to the session's effective
 * permissions (RBAC-006) and the current path for active state. Data used for
 * authorization always comes from the backend `/auth/me` result (RBAC-001).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();

  const isActive = (href: string) =>
    pathname === href ||
    pathname === `${href}/` ||
    pathname.startsWith(`${href}/`);

  const navItems = user ? [...screenNavItems(user.permissions), SETTINGS_NAV] : [];

  return (
    <div className="flex min-h-screen bg-muted/30">
      <SessionWatcher />

      <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight"
          >
            Deliverix
          </Link>
        </div>
        <nav
          aria-label="Primary"
          className="flex-1 space-y-1 overflow-y-auto p-2"
        >
          {user === undefined ? (
            <SidebarSkeleton />
          ) : (
            navItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(item.href)}
              />
            ))
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
          <Link href="/dashboard" className="text-base font-semibold md:hidden">
            Deliverix
          </Link>
          <div className="hidden md:block" />
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