"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { NavSection } from "@/components/shared/nav-config";
import { cn } from "@/lib/utils/cn";

export function isActiveNavPath(pathname: string, href: string) {
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
        "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground",
      )}
    >
      {/* Active indicator bar */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-4 p-2">
      {["Overview", "Operations", "Fleet", "System"].map((label) => (
        <div key={label} className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Grouped, permission-filtered primary navigation (NAV-003, RBAC-006),
 * shared by the desktop sidebar and the mobile drawer so both render an
 * identical list. Filtering is presentation-only — the backend remains the
 * authorization boundary (RBAC-001/002).
 */
export function SidebarNav({
  sections,
  loading,
  pathname,
  onNavigate,
  className,
}: {
  sections: NavSection[];
  loading: boolean;
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Primary"
      className={cn("flex-1 space-y-5 overflow-y-auto px-2 py-4", className)}
    >
      {loading ? (
        <SectionSkeleton />
      ) : (
        sections.map((section) => (
          <div key={section.key} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </p>
            {section.items.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActiveNavPath(pathname, item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))
      )}
    </nav>
  );
}
