import { Suspense } from "react";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-client";
import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import {
  VehiclesExplorer,
  type VehicleExplorerInitialFilters,
} from "@/features/vehicles/components/vehicles-explorer";
import { vehicleListParamsSchema } from "@/features/vehicles/schemas";
import type { VehicleListPage } from "@/features/vehicles/types";
import type { VehiclePage } from "@/features/vehicles/types";

export const metadata: Metadata = { title: "Vehicles" };

async function loadVehicles(
  filters: VehicleExplorerInitialFilters & { page?: number; pageSize?: number },
): Promise<VehicleListPage> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize ?? 20));
  const qs = params.toString();
  const result = await serverFetch<VehiclePage>(`/vehicles${qs ? `?${qs}` : ""}`);
  return {
    vehicles: result.data,
    page: result.meta.page,
    totalPages: result.meta.totalPages,
    hasMore: result.meta.page < result.meta.totalPages,
  };
}

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { status, search, page, pageSize } = vehicleListParamsSchema.parse(raw);

  const filters: VehicleExplorerInitialFilters = {
    status,
    search,
  };

  let initialData: VehicleListPage | undefined;
  try {
    initialData = await loadVehicles({ ...filters, page, pageSize });
  } catch {
    // Vehicles page keeps rendering with an empty list even if the backend is
    // momentarily unavailable; the client explorer retries.
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Vehicles" }]} />
      <PageHeader
        title="Vehicles"
        description="Manage the fleet: registration, status, and allocation."
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="h-8 w-64 rounded-lg bg-muted" />
              <div className="h-8 w-32 rounded-lg bg-muted" />
            </div>
            <div className="h-[400px] rounded-lg border bg-muted/20" />
          </div>
        }
      >
        <VehiclesExplorer
          initialResult={{
            vehicles: initialData ?? {
              vehicles: [],
              page: 1,
              totalPages: 0,
              hasMore: false,
            },
          }}
          initialFilters={filters}
        />
      </Suspense>
    </div>
  );
}