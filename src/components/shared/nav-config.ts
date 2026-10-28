import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Clipboard,
  Contact,
  Layers,
  LayoutDashboard,
  Map,
  Package,
  Radar,
  ScrollText,
  Settings,
  Truck,
  UserCog,
  Users,
} from "lucide-react";

export type NavGroupKey =
  | "overview"
  | "operations"
  | "fleet"
  | "network"
  | "insights"
  | "system";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Sidebar section the item belongs to. */
  group: NavGroupKey;
  /** When provided, the item is shown only if the user holds at least one permission. */
  permissions?: string[];
}

const GROUP_ORDER: NavGroupKey[] = [
  "overview",
  "operations",
  "fleet",
  "network",
  "insights",
  "system",
];

export const GROUP_LABELS: Record<NavGroupKey, string> = {
  overview: "Overview",
  operations: "Operations",
  fleet: "Fleet",
  network: "Network",
  insights: "Insights",
  system: "System",
};

/**
 * Primary navigation groups (NAV-003), filtered by the authenticated user's
 * effective permissions (RBAC-006). Filtering is presentation-only — the
 * backend remains the authorization boundary (RBAC-001/002).
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "overview",
  },
  {
    label: "Orders",
    href: "/orders",
    icon: Package,
    group: "operations",
    permissions: ["orders.view"],
  },
  {
    label: "Dispatch",
    href: "/dispatch",
    icon: Radar,
    group: "operations",
    permissions: ["dispatch.view-queue"],
  },
  {
    label: "My Assignments",
    href: "/drivers/assignments",
    icon: Clipboard,
    group: "operations",
  },
  {
    label: "Drivers",
    href: "/drivers",
    icon: Users,
    group: "fleet",
    permissions: ["drivers.view", "drivers.manage", "dispatch.view-queue"],
  },
  {
    label: "Vehicles",
    href: "/vehicles",
    icon: Truck,
    group: "fleet",
    permissions: ["vehicles.view", "vehicles.manage", "drivers.view"],
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Contact,
    group: "network",
    permissions: ["customers.view", "customers.manage"],
  },
  {
    label: "Zones",
    href: "/zones",
    icon: Map,
    group: "network",
    permissions: ["zones.view", "zones.manage"],
  },
  {
    label: "Service Types",
    href: "/service-types",
    icon: Layers,
    group: "network",
    permissions: ["config.manage"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    group: "insights",
    permissions: ["reports.view"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    group: "insights",
    permissions: ["notifications.view"],
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: ScrollText,
    group: "insights",
    permissions: ["audit.view"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    group: "system",
  },
  {
    label: "Users",
    href: "/settings/users",
    icon: UserCog,
    group: "system",
    permissions: ["users.view", "users.manage"],
  },
];

/** Items visible for a user holding the given permission codes. */
export function screenNavItems(permissions: string[]): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some((permission) => permissions.includes(permission));
  });
}

/**
 * Sidebar/tablet/mobile nav sections in display order. Groups that become
 * empty after permission filtering are omitted entirely.
 */
export function screenNavGroups(permissions: string[]): NavSection[] {
  const visible = screenNavItems(permissions);
  return GROUP_ORDER.map((key) => ({
    key,
    label: GROUP_LABELS[key],
    items: visible.filter((item) => item.group === key),
  })).filter((section) => section.items.length > 0);
}

export interface NavSection {
  key: NavGroupKey;
  label: string;
  items: NavItem[];
}
