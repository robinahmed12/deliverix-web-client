import { serverFetch } from "@/lib/api/server-client";
import { PageHeader } from "@/components/shared/page-header";
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

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Operational overview for your deliveries."
      />
      <DashboardView initialData={initialData} hasPermission={hasReportAccess} />
    </div>
  );
}