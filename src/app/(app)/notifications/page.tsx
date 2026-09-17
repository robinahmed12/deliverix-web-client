import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { NotificationsView } from "@/features/notifications/components/notifications-view";

export default function NotificationsPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Notifications" }]} />
      <PageHeader
        title="Notifications"
        description="In-app notifications for orders, offers, and account events."
      />
      <NotificationsView />
    </div>
  );
}