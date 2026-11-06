import { Metadata } from "next";
import { PortalDashboardView } from "@/features/customers/components/portal-dashboard-view";

export const metadata: Metadata = {
  title: "Customer Portal | Deliverix",
  description: "Track your active deliveries, manage saved addresses, and get instant customer support.",
};

export default function PortalPage() {
  return <PortalDashboardView />;
}
