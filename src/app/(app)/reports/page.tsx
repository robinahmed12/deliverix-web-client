import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ReportsExplorer } from "@/features/reports/components/reports-explorer";

export default function ReportsPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Reports" }]} />
      <PageHeader
        title="Reports"
        description="Delivery, driver, and zone performance reports."
      />
      <ReportsExplorer />
    </div>
  );
}