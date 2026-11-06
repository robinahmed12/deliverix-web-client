import { serverFetch } from "@/lib/api/server-client";
import { DashboardView } from "@/features/reports/components/dashboard-view";
import { DriverDashboardView } from "@/features/drivers/components/driver-dashboard-view";
import { PortalDashboardView } from "@/features/customers/components/portal-dashboard-view";
import type { DashboardReport } from "@/features/reports/types";
import type { CurrentUser } from "@/lib/api/types";

export default async function DashboardPage() {
  let currentUser: CurrentUser | null = null;
  try {
    currentUser = await serverFetch<CurrentUser>("/auth/me");
  } catch {
    currentUser = null;
  }

  // If authenticated user is a Driver, always render the Driver Dashboard
  if (currentUser?.roles?.includes("driver")) {
    return <DriverDashboardView />;
  }

  // If authenticated user is a Customer, render the Customer Portal Dashboard
  if (
    currentUser?.roles?.includes("customer") ||
    (!currentUser?.roles?.includes("admin") &&
      !currentUser?.roles?.includes("dispatcher") &&
      !currentUser?.roles?.includes("support") &&
      currentUser?.permissions?.includes("customers.me.view"))
  ) {
    return <PortalDashboardView />;
  }

  // Otherwise, load administrative/dispatch reports dashboard
  let initialData: DashboardReport | undefined;
  let hasReportAccess = false;
  try {
    initialData = await serverFetch<DashboardReport>("/reports/dashboard");
    hasReportAccess = true;
  } catch {
    hasReportAccess = false;
  }

  // The dashboard view renders its own hero band, so no PageHeader here.
  return <DashboardView initialData={initialData} hasPermission={hasReportAccess} />;
}
