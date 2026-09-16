import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { SecurityView } from "./security-view";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Settings", href: "/settings" }, { label: "Security" }]}
      />
      <PageHeader
        title="Security"
        description="Manage your password and two-factor authentication."
      />
      <SecurityView />
    </div>
  );
}