import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { AuditLogsView } from "@/features/audit-logs/components/audit-logs-view";

export default function AuditLogsPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Audit Logs" }]} />
      <PageHeader
        title="Audit Logs"
        description="Read-only audit trail of critical system changes."
      />
      <AuditLogsView />
    </div>
  );
}