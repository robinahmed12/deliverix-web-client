import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
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

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When provided, the item is shown only if the user holds at least one permission. */
  permissions?: string[];
}

/**
 * Primary navigation groups (NAV-003), filtered by the authenticated user's
 * effective permissions (RBAC-006). Filtering is presentation-only — the
 * backend remains the authorization boundary (RBAC-001/002).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Orders",
    href: "/orders",
    icon: Package,
    permissions: ["orders.view"],
  },
  {
    label: "Dispatch",
    href: "/dispatch",
    icon: Radar,
    permissions: ["dispatch.view-queue"],
  },
  {
    label: "Drivers",
    href: "/drivers",
    icon: Users,
    permissions: ["drivers.view", "drivers.manage", "dispatch.view-queue"],
  },
  {
    label: "Vehicles",
    href: "/vehicles",
    icon: Truck,
    permissions: ["vehicles.view", "vehicles.manage", "drivers.view"],
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Contact,
    permissions: ["customers.view", "customers.manage"],
  },
  {
    label: "Users",
    href: "/settings/users",
    icon: UserCog,
    permissions: ["users.view", "users.manage"],
  },
  {
    label: "Zones",
    href: "/zones",
    icon: Map,
    permissions: ["zones.view", "zones.manage"],
  },
  {
    label: "Service Types",
    href: "/service-types",
    icon: Layers,
    permissions: ["config.manage"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    permissions: ["reports.view"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    permissions: ["notifications.view"],
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: ScrollText,
    permissions: ["audit.view"],
  },
];

export const SETTINGS_NAV: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
};

/** Items visible for a user holding the given permission codes. */
export function screenNavItems(permissions: string[]): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some((permission) => permissions.includes(permission));
  });
}