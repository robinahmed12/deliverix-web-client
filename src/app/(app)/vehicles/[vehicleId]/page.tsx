import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api/server-client";
import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { VehicleDetailView } from "@/features/vehicles/components/vehicle-detail-view";
import type { VehicleDetail } from "@/features/vehicles/types";

async function loadVehicle(id: string): Promise<VehicleDetail> {
  return serverFetch<VehicleDetail>(`/vehicles/${id}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}): Promise<Metadata> {
  const { vehicleId } = await params;
  return { title: `Vehicle ${vehicleId}` };
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;

  let vehicle: VehicleDetail;
  try {
    vehicle = await loadVehicle(vehicleId);
  } catch {
    notFound();
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Vehicles", href: "/vehicles" },
          { label: vehicle.registrationNumber },
        ]}
      />
      <PageHeader
        title={`Vehicle ${vehicle.registrationNumber}`}
        description={`Status: ${vehicle.status}`}
      />
      <VehicleDetailView vehicleId={vehicleId} initialData={vehicle} />
    </div>
  );
}