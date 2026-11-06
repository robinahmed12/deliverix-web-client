import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Clipboard,
  Contact,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Map,
  MapPin,
  Package,
  PackageCheck,
  Radar,
  ScrollText,
  Settings,
  Truck,
  User,
  UserCog,
  Users,
} from "lucide-react";

export type NavGroupKey =
  | "overview"
  | "portal"
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
  /** When provided, the item is shown if the user holds at least one role. */
  roles?: string[];
}

const GROUP_ORDER: NavGroupKey[] = [
  "overview",
  "portal",
  "operations",
  "fleet",
  "network",
  "insights",
  "system",
];

export const GROUP_LABELS: Record<NavGroupKey, string> = {
  overview: "Overview",
  portal: "Customer Portal",
  operations: "Operations",
  fleet: "Fleet",
  network: "Network",
  insights: "Insights",
  system: "System",
};

/**
 * Primary navigation groups (NAV-003), filtered by the authenticated user's
 * effective permissions (RBAC-006) and roles. Filtering is presentation-only — the
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
    label: "Customer Portal",
    href: "/portal",
    icon: PackageCheck,
    group: "portal",
    permissions: ["customers.me.view"],
    roles: ["customer"],
  },
  {
    label: "My Orders",
    href: "/portal/orders",
    icon: Package,
    group: "portal",
    permissions: ["customers.me.view"],
    roles: ["customer"],
  },
  {
    label: "Saved Addresses",
    href: "/portal/addresses",
    icon: MapPin,
    group: "portal",
    permissions: ["customers.me.addresses", "customers.me.view"],
    roles: ["customer"],
  },
  {
    label: "Customer Profile",
    href: "/portal/profile",
    icon: User,
    group: "portal",
    permissions: ["customers.me.view"],
    roles: ["customer"],
  },
  {
    label: "AI Support & FAQ",
    href: "/portal/support",
    icon: HelpCircle,
    group: "portal",
    permissions: ["customers.me.view"],
    roles: ["customer"],
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
    roles: ["driver", "dispatcher", "admin"],
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

/** Items visible for a user holding the given permission codes and roles. */
export function screenNavItems(
  permissions: string[] = [],
  roles: string[] = [],
): NavItem[] {
  const isCustomer = roles.includes("customer");

  return NAV_ITEMS.filter((item) => {
    // 1. Customer portal items MUST ONLY be shown if a customer is logged in.
    // Non-customers (admin, dispatcher, driver, support) should NOT see them.
    if (item.group === "portal") {
      return isCustomer;
    }

    // 2. If user is a customer, omit staff-internal tools (operations, fleet, network, insights, user management)
    if (isCustomer) {
      if (
        item.group === "operations" ||
        item.group === "fleet" ||
        item.group === "network" ||
        item.group === "insights" ||
        item.href === "/settings/users"
      ) {
        return false;
      }
    }

    // 3. Role restriction check (e.g. driver assignments)
    if (item.roles && item.roles.length > 0) {
      const hasRole = item.roles.some((r) => roles.includes(r));
      if (!hasRole && (!item.permissions || item.permissions.length === 0)) return false;
      if (hasRole) return true;
    }

    // 4. Permission check
    if (item.permissions && item.permissions.length > 0) {
      return item.permissions.some((permission) => permissions.includes(permission));
    }

    // Fallback for items with role restriction when user doesn't hold the role
    if (item.roles && item.roles.length > 0) {
      return false;
    }

    return true;
  });
}

/**
 * Sidebar/tablet/mobile nav sections in display order. Groups that become
 * empty after permission filtering are omitted entirely.
 */
export function screenNavGroups(
  permissions: string[] = [],
  roles: string[] = [],
): NavSection[] {
  const visible = screenNavItems(permissions, roles);
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
