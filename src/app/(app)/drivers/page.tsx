import { Suspense } from "react";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-client";
import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import {
  DriversExplorer,
  type DriverExplorerInitialFilters,
} from "@/features/drivers/components/drivers-explorer";
import { driverListParamsSchema } from "@/features/drivers/schemas";
import type { DriverListPage } from "@/features/drivers/types";
import type { DriverPage } from "@/features/drivers/types";

export const metadata: Metadata = { title: "Drivers" };

async function loadDrivers(
  filters: DriverExplorerInitialFilters & { page?: number; pageSize?: number },
): Promise<DriverListPage> {
  const params = new URLSearchParams();
  if (filters.state) params.set("state", filters.state);
  if (filters.active !== undefined) params.set("active", String(filters.active));
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize ?? 20));
  const qs = params.toString();
  const result = await serverFetch<DriverPage>(`/drivers${qs ? `?${qs}` : ""}`);
  return {
    drivers: result.data,
    page: result.meta.page,
    totalPages: result.meta.totalPages,
    hasMore: result.meta.page < result.meta.totalPages,
  };
}

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { state, active, search, page, pageSize } =
    driverListParamsSchema.parse(raw);

  const filters: DriverExplorerInitialFilters = {
    state,
    active,
    search,
  };

  let initialData: DriverListPage | undefined;
  try {
    initialData = await loadDrivers({ ...filters, page, pageSize });
  } catch {
    // Drivers page keeps rendering with an empty list even if the backend is
    // momentarily unavailable; the client explorer retries.
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Drivers" }]} />
      <PageHeader
        title="Drivers"
        description="Manage driver records and availability."
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
        <DriversExplorer
          initialResult={{
            drivers: initialData ?? {
              drivers: [],
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