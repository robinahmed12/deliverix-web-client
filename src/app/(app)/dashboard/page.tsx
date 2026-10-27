import { serverFetch } from "@/lib/api/server-client";
import { DashboardView } from "@/features/reports/components/dashboard-view";
import type { DashboardReport } from "@/features/reports/types";

export default async function DashboardPage() {
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