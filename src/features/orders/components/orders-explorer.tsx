"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "../components/order-status-badge";
import { useOrdersInfinite, useOrderPermissions } from "../queries";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import type {
  Order,
  OrderListFilters,
  OrderPage,
  ORDER_STATUSES,
} from "../types";

interface OrdersExplorerProps {
  filters: OrderListFilters;
  pageSize: number;
  initialData?: OrderPage;
}

export function OrdersExplorer({
  filters,
  pageSize,
  initialData,
}: OrdersExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canCreate } = useOrderPermissions();

  const [searchInput, setSearchInput] = React.useState(filters.search ?? "");

  const query = useOrdersInfinite(
    { ...filters, pageSize },
    initialData,
  );

  const allOrders = React.useMemo(
    () => query.data?.pages.flatMap((p) => p.orders) ?? [],
    [query.data],
  );

  const hasNextPage = React.useMemo(() => {
    if (!query.data || query.data.pages.length === 0) return false;
    return query.data.pages[query.data.pages.length - 1].hasMore;
  }, [query.data]);

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("cursor");
    router.push(`/orders?${params.toString()}`, { scroll: false });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("search", searchInput.trim() || null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <Input
              placeholder="Search by order number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
          <select
            value={filters.status ?? ""}
            onChange={(e) =>
              updateFilter("status", e.target.value || null)
            }
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All statuses</option>
            {[
              "Pending",
              "ReadyForPickup",
              "Assigned",
              "PickedUp",
              "InTransit",
              "OutForDelivery",
              "Failed",
              "ReturnInProgress",
              "Delivered",
              "Cancelled",
              "Returned",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {canCreate && (
          <Button asChild size="sm">
            <Link href="/orders/new">New order</Link>
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Promised window</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : allOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.promisedAtStart
                        ? `${formatDateTime(order.promisedAtStart)} – ${formatDateTime(order.promisedAtEnd)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {order.deliveryFee
                        ? formatCurrency(order.deliveryFee, order.currencyCode)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/orders/${order.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            {!query.isLoading && allOrders.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}