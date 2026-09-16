import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api/server-client";
import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { DriverDetailView } from "@/features/drivers/components/driver-detail-view";
import type { DriverDetail } from "@/features/drivers/types";

async function loadDriver(id: string): Promise<DriverDetail> {
  return serverFetch<DriverDetail>(`/drivers/${id}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ driverId: string }>;
}): Promise<Metadata> {
  const { driverId } = await params;
  return { title: `Driver ${driverId}` };
}

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;

  let driver: DriverDetail;
  try {
    driver = await loadDriver(driverId);
  } catch {
    notFound();
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Drivers", href: "/drivers" },
          { label: driver.driverCode },
        ]}
      />
      <PageHeader
        title={`Driver ${driver.driverCode}`}
        description={`Status: ${driver.active ? "Active" : "Inactive"} · ${driver.state}`}
      />
      <DriverDetailView driverId={driverId} initialData={driver} />
    </div>
  );
}