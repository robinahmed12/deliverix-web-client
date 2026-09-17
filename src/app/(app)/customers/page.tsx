import { Suspense } from "react";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server-client";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import {
  CustomersExplorer,
  type CustomerExplorerInitialFilters,
} from "@/features/customers/components/customers-explorer";
import { customerListParamsSchema } from "@/features/customers/schemas";
import type {
  CustomerListPage,
  CustomerPage,
} from "@/features/customers/types";

export const metadata: Metadata = { title: "Customers" };

async function loadCustomers(
  filters: CustomerExplorerInitialFilters & { page?: number; pageSize?: number },
): Promise<CustomerListPage> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize ?? 20));
  const qs = params.toString();
  const result = await serverFetch<CustomerPage>(`/customers${qs ? `?${qs}` : ""}`);
  return {
    customers: result.data,
    page: result.meta.page,
    totalPages: result.meta.totalPages,
    hasMore: result.meta.page < result.meta.totalPages,
  };
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { status, search, page, pageSize } = customerListParamsSchema.parse(raw);

  const filters: CustomerExplorerInitialFilters = { status, search };

  let initialData: CustomerListPage | undefined;
  try {
    initialData = await loadCustomers({ ...filters, page, pageSize });
  } catch {
    // Customers page keeps rendering with an empty list even if the backend is
    // momentarily unavailable; the client explorer retries.
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Customers" }]} />
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
        <CustomersExplorer
          initialResult={{
            customers: initialData ?? {
              customers: [],
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