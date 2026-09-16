import { Suspense } from "react";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-client";
import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { DispatchBoard } from "@/features/dispatch/components/dispatch-board";
import type {
  DispatchQueuePage,
  DriverWorkloadsResponse,
} from "@/features/dispatch/types";
import type { ZoneSummary } from "@/features/orders/types";
import type { DataResponse } from "@/lib/api/types";

export const metadata: Metadata = { title: "Dispatch" };

const EMPTY_QUEUE: DispatchQueuePage = {
  data: [],
  pageInfo: { hasMore: false, nextCursor: null },
};

async function loadInitialData(): Promise<{
  queue: DispatchQueuePage;
  workloads: DriverWorkloadsResponse;
  zones: ZoneSummary[];
}> {
  const [queue, workloads, zones] = await Promise.allSettled([
    serverFetch<DispatchQueuePage>("/dispatch/queue?pageSize=20"),
    serverFetch<DriverWorkloadsResponse>("/dispatch/workloads"),
    serverFetch<DataResponse<ZoneSummary[]>>("/zones"),
  ]);

  return {
    queue: queue.status === "fulfilled" ? queue.value : EMPTY_QUEUE,
    workloads: workloads.status === "fulfilled" ? workloads.value : { data: [] },
    zones:
      zones.status === "fulfilled" && Array.isArray(zones.value.data)
        ? zones.value.data
        : [],
  };
}

export default async function DispatchPage() {
  const initial = await loadInitialData();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dispatch" }]} />
      <PageHeader
        title="Dispatch"
        description="Assign drivers to ready orders and manage the assignment lifecycle."
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-8 w-64 rounded-lg bg-muted" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="h-[400px] rounded-lg border bg-muted/20 lg:col-span-2" />
              <div className="h-[400px] rounded-lg border bg-muted/20" />
            </div>
          </div>
        }
      >
        <DispatchBoard
          initialQueue={initial.queue}
          initialWorkloads={initial.workloads.data}
          initialZones={initial.zones}
        />
      </Suspense>
    </div>
  );
}