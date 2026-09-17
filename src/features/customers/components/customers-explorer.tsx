"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCustomersInfinite,
  useCustomerPermissions,
} from "../queries";
import type { CustomerListFilters, CustomerListPage } from "../types";
import { CUSTOMER_STATUSES } from "../types";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { formatDate } from "@/lib/utils/formatters";
import { Contact, Search } from "lucide-react";
import { CreateCustomerDialog } from "./create-customer-dialog";

export interface CustomerExplorerInitialFilters {
  status?: "active" | "inactive";
  search?: string;
}

interface CustomersExplorerProps {
  initialResult: {
    customers: CustomerListPage;
  };
  initialFilters: CustomerExplorerInitialFilters;
}

export function CustomersExplorer({
  initialResult,
  initialFilters,
}: CustomersExplorerProps) {
  const router = useRouter();
  const permissions = useCustomerPermissions();
  const [statusFilter, setStatusFilter] = React.useState<string>(
    initialFilters.status ?? "",
  );
  const [searchInput, setSearchInput] = React.useState(initialFilters.search ?? "");
  const [search, setSearch] = React.useState(initialFilters.search ?? "");
  const [createOpen, setCreateOpen] = React.useState(false);

  const filters: Omit<CustomerListFilters, "page"> = {
    status:
      statusFilter === ""
        ? undefined
        : (statusFilter as "active" | "inactive"),
    search: search || undefined,
  };

  const customersQuery = useCustomersInfinite(
    filters,
    initialResult.customers,
  );

  const customers = React.useMemo(
    () => (customersQuery.data?.pages ?? []).flatMap((p) => p.customers),
    [customersQuery.data],
  );

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer records and address books."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={submitSearch}
          className="flex w-full max-w-sm items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Search customers"
              placeholder="Search by name or email…"
              className="pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSearchInput("");
              }}
            >
              Clear
            </Button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="status-filter" className="sr-only">
            Filter by status
          </Label>
          <select
            id="status-filter"
            aria-label="Filter by status"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "active" ? "Active" : "Inactive"}
              </option>
            ))}
          </select>

          {permissions.canManage && (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              New customer
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        {customersQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : customersQuery.isError ? (
          <ErrorState
            error={customersQuery.error}
            onRetry={() => void customersQuery.refetch()}
          />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="No customers match the current filters."
            icon={<Contact className="size-8" aria-hidden="true" />}
          />
        ) : (
          <div className="space-y-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {customer.status === "active" ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.email ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {customer.phone ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{formatDate(customer.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {customersQuery.hasNextPage && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={customersQuery.isFetchingNextPage}
                onClick={() => void customersQuery.fetchNextPage()}
              >
                {customersQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            )}
          </div>
        )}
      </div>

      <CreateCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}