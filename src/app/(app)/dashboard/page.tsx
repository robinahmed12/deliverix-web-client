import { PageHeader } from "@/components/shared/page-header";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Operational overview for your deliveries."
      />
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Dashboard widgets arrive with the Reports phase (Phase 6).
      </div>
    </div>
  );
}