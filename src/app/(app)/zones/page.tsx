import { Suspense } from "react";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-client";
import type { DataResponse } from "@/lib/api/types";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import {
  ZonesExplorer,
  type ZoneExplorerInitialFilters,
} from "@/features/zones/components/zones-explorer";
import { zoneListParamsSchema } from "@/features/zones/schemas";
import type { ZoneListItem } from "@/features/zones/types";

export const metadata: Metadata = { title: "Zones" };

async function loadZones(
  filters: ZoneExplorerInitialFilters,
): Promise<ZoneListItem[]> {
  const params = new URLSearchParams();
  if (filters.active !== undefined) params.set("active", String(filters.active));
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  const result = await serverFetch<DataResponse<ZoneListItem[]>>(
    `/zones${qs ? `?${qs}` : ""}`,
  );
  return result.data;
}

export default async function ZonesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { active, search } = zoneListParamsSchema.parse(raw);

  const filters: ZoneExplorerInitialFilters = { active, search };

  let initialZones: ZoneListItem[] | undefined;
  try {
    initialZones = await loadZones(filters);
  } catch {
    // Zones page keeps rendering with an empty list even if the backend is
    // momentarily unavailable; the client explorer retries.
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Zones" }]} />
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
        <ZonesExplorer
          initialResult={{ zones: initialZones ?? [] }}
          initialFilters={filters}
        />
      </Suspense>
    </div>
  );
}