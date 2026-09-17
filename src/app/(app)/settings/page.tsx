import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { SettingsView } from "@/features/settings/components/settings-view";

export default function SettingsPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Settings" }]} />
      <PageHeader
        title="Settings"
        description="Account, security, and system configuration."
      />
      <SettingsView />
    </div>
  );
}