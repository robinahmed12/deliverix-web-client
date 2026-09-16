import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api/server-client";
import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { OrdersExplorer } from "@/features/orders/components/orders-explorer";
import { parseOrderListParams } from "@/features/orders/schemas";
import type { Order, OrderPage } from "@/features/orders/types";
import type { PaginatedResponse } from "@/lib/api/types";

export const metadata: Metadata = { title: "Orders" };

async function loadOrders(
  status?: string,
  search?: string,
  pageSize?: number,
): Promise<OrderPage> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  if (pageSize) params.set("pageSize", String(pageSize));
  const qs = params.toString();
  const result = await serverFetch<PaginatedResponse<Order>>(
    `/orders${qs ? `?${qs}` : ""}`,
  );
  return {
    orders: result.data,
    nextCursor: result.meta.nextCursor ?? null,
    hasMore: Boolean(result.meta.hasMore),
  };
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { status, search, pageSize } = parseOrderListParams(raw);

  let initialData: OrderPage | undefined;
  try {
    initialData = await loadOrders(status, search, pageSize);
  } catch {
    notFound();
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Orders" }]} />
      <PageHeader
        title="Orders"
        description="View and manage delivery orders."
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
        <OrdersExplorer
          filters={{ status, search }}
          pageSize={pageSize}
          initialData={initialData}
        />
      </Suspense>
    </div>
  );
}