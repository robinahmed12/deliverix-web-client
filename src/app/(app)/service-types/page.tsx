import { Suspense } from "react";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-client";
import type { DataResponse } from "@/lib/api/types";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ServiceTypesExplorer } from "@/features/service-types/components/service-types-explorer";
import { serviceTypeListParamsSchema } from "@/features/service-types/schemas";
import type { ServiceTypeListItem } from "@/features/service-types/types";

export const metadata: Metadata = { title: "Service types" };

async function loadServiceTypes(
  filters: { active?: boolean; search?: string },
): Promise<ServiceTypeListItem[]> {
  const params = new URLSearchParams();
  if (filters.active !== undefined) params.set("active", String(filters.active));
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  const result = await serverFetch<DataResponse<ServiceTypeListItem[]>>(
    `/service-types${qs ? `?${qs}` : ""}`,
  );
  return result.data;
}

export default async function ServiceTypesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { active, search } = serviceTypeListParamsSchema.parse(raw);

  let initialServiceTypes: ServiceTypeListItem[] | undefined;
  try {
    initialServiceTypes = await loadServiceTypes({ active, search });
  } catch {
    // Service types page keeps rendering with an empty list even if the backend
    // is momentarily unavailable; the client explorer retries.
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Service types" }]} />
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
        <ServiceTypesExplorer
          initialResult={{ serviceTypes: initialServiceTypes ?? [] }}
          initialFilters={{ active, search }}
        />
      </Suspense>
    </div>
  );
}