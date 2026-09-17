import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ConfigManagementView } from "@/features/config-management/components/config-management-view";

export default function ConfigPage() {
  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Settings", href: "/settings" }, { label: "System configuration" }]}
      />
      <PageHeader
        title="System configuration"
        description="Failure reasons, proof policies, and system settings."
      />
      <ConfigManagementView />
    </div>
  );
}