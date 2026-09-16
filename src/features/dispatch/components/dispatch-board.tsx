"use client";

import * as React from "react";
import {
  useDispatchQueueInfinite,
  useDriverWorkloads,
  useDispatchedOrdersInfinite,
  useAssignmentHistory,
  useDispatchPermissions,
} from "../queries";
import { useZones } from "@/features/orders/queries";
import type { ZoneSummary } from "@/features/orders/types";
import { OrderQueueItem } from "./order-queue-item";
import { AssignmentHistoryTable } from "./assignment-history-table";
import { AssignOrderDialog } from "./assign-order-dialog";
import { ReassignDialog } from "./reassign-dialog";
import { WithdrawConfirmation } from "./withdraw-confirmation";
import { ACTIVE_ASSIGNMENT_STATUSES } from "../types";
import type {
  DispatchQueueOrder,
  DispatchQueuePage,
  DriverWorkload,
} from "../types";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { formatDateTime } from "@/lib/utils/formatters";
import { Package } from "lucide-react";

interface DispatchBoardProps {
  initialQueue: DispatchQueuePage;
  initialWorkloads: DriverWorkload[];
  initialZones: ZoneSummary[];
}

const WORKLOAD_STATES = ["All", "Available", "Assigned", "OnDelivery", "Offline", "Unavailable"] as const;

function addressLine(address: Record<string, unknown>): string {
  const line1 = typeof address.line1 === "string" ? address.line1 : "";
  const city = typeof address.city === "string" ? address.city : "";
  return [line1, city].filter(Boolean).join(", ");
}

export function DispatchBoard({
  initialQueue,
  initialWorkloads,
  initialZones,
}: DispatchBoardProps) {
  const permissions = useDispatchPermissions();
  const [zoneFilter, setZoneFilter] = React.useState<string>("");
  const [stateFilter, setStateFilter] = React.useState<string>("");
  const [tab, setTab] = React.useState<"ready" | "inprogress">("ready");
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>("");

  const [assignOpen, setAssignOpen] = React.useState(false);
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);

  const zonesQuery = useZones(initialZones);
  const zoneOptions = zonesQuery.data ?? initialZones;

  const queueQuery = useDispatchQueueInfinite(
    { pageSize: 20, zoneId: zoneFilter || undefined },
    initialQueue,
  );
  const dispatchedQuery = useDispatchedOrdersInfinite(20);
  const workloadsQuery = useDriverWorkloads(stateFilter || undefined, initialWorkloads);

  const historyQuery = useAssignmentHistory(selectedOrderId);

  const queueOrders = React.useMemo(
    () => (queueQuery.data?.pages ?? []).flatMap((p) => p.data),
    [queueQuery.data],
  );
  const dispatchedOrders = React.useMemo(
    () => (dispatchedQuery.data?.pages ?? []).flatMap((p) => p.orders),
    [dispatchedQuery.data],
  );

  const currentOrders =
    tab === "ready"
      ? queueOrders.map((o) => ({
          id: o.id!,
          orderNumber: o.orderNumber,
          status: o.status,
          zoneName: o.zoneName,
          createdAt: o.createdAt,
          readyAt: o.readyAt,
          pickupAddress: o.pickupAddress,
          deliveryAddress: o.deliveryAddress,
        }))
      : dispatchedOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          zoneName: null,
          createdAt: o.createdAt,
          readyAt: o.readyAt,
          pickupAddress: o.pickupAddress as unknown as Record<string, unknown>,
          deliveryAddress: o.deliveryAddress as unknown as Record<string, unknown>,
        }));

  const selectedOrder =
    currentOrders.find((o) => o.id === selectedOrderId) ?? null;

  const hasMore =
    tab === "ready"
      ? queueQuery.hasNextPage
      : dispatchedQuery.hasNextPage;

  const isLoadingMore = queueQuery.isFetchingNextPage || dispatchedQuery.isFetchingNextPage;

  const history = historyQuery.data ?? [];
  const latest = history.length > 0 ? history[history.length - 1] : null;
  const isOffered = latest?.status === "Offered";
  const isAccepted = latest?.status === "Accepted";
  const hasOpenAssignment =
    latest !== null && ACTIVE_ASSIGNMENT_STATUSES.has(latest.status);
  const currentDriverCode = isOffered || isAccepted ? latest.driverCode : null;
  const currentAssignmentId = hasOpenAssignment ? latest.id : null;

  function loadMore() {
    if (tab === "ready") {
      void queueQuery.fetchNextPage();
    } else {
      void dispatchedQuery.fetchNextPage();
    }
  }

  const queueError = queueQuery.isError ? queueQuery.error : null;
  const dispatchedError = dispatchedQuery.isError ? dispatchedQuery.error : null;
  const currentError = tab === "ready" ? queueError : dispatchedError;

  return (
    <div>
      <PageHeader
        title="Dispatch"
        description="Assign drivers to ready orders and manage the assignment lifecycle."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setTab("ready")}
                className={
                  tab === "ready"
                    ? "rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm"
                    : "rounded-md px-3 py-1.5 text-sm text-muted-foreground"
                }
              >
                Ready queue
              </button>
              <button
                type="button"
                onClick={() => setTab("inprogress")}
                className={
                  tab === "inprogress"
                    ? "rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm"
                    : "rounded-md px-3 py-1.5 text-sm text-muted-foreground"
                }
              >
                In progress
              </button>
            </div>
            {tab === "ready" && (
              <select
                aria-label="Filter by zone"
                className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
              >
                <option value="">All zones</option>
                {zoneOptions.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {currentError ? (
            <ErrorState
              error={currentError}
              onRetry={
                tab === "ready"
                  ? () => void queueQuery.refetch()
                  : () => void dispatchedQuery.refetch()
              }
            />
          ) : tab === "ready" && queueQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : tab === "inprogress" && dispatchedQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : currentOrders.length === 0 ? (
            <EmptyState
              title={
                tab === "ready"
                  ? "Queue is clear"
                  : "No orders in progress"
              }
              description={
                tab === "ready"
                  ? "No ready, unassigned orders right now."
                  : "No orders have an accepted assignment right now."
              }
              icon={<Package className="size-8" aria-hidden="true" />}
            />
          ) : (
            <div className="space-y-2">
              {currentOrders.map((o) => (
                <OrderQueueItem
                  key={o.id}
                  order={o as DispatchQueueOrder}
                  isSelected={selectedOrderId === o.id}
                  onSelect={setSelectedOrderId}
                />
              ))}
              {hasMore && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoadingMore}
                  onClick={loadMore}
                >
                  {isLoadingMore ? "Loading…" : "Load more"}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Drivers</CardTitle>
              <select
                aria-label="Filter driver state"
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
              >
                {WORKLOAD_STATES.map((s) => (
                  <option key={s} value={s === "All" ? "" : s}>
                    {s}
                  </option>
                ))}
              </select>
            </CardHeader>
            <CardContent>
              {workloadsQuery.isError ? (
                <ErrorState
                  error={workloadsQuery.error}
                  onRetry={() => void workloadsQuery.refetch()}
                />
              ) : workloadsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (workloadsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No drivers match this filter.
                </p>
              ) : (
                <ul className="divide-y">
                  {(workloadsQuery.data ?? []).map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-2 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {d.name}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({d.driverCode})
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Active: {d.activeAccepted} · Completed today: {d.completedToday}
                        </p>
                      </div>
                      <Badge variant="outline">{d.state}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment history</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedOrder ? (
                historyQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <AssignmentHistoryTable
                    history={history}
                    isLoading={false}
                  />
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select an order to view its assignment history.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedOrder && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>{selectedOrder.orderNumber}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedOrder.status}</Badge>
                {latest && (
                  <span className="text-xs text-muted-foreground">
                    {currentDriverCode
                      ? `Currently with ${currentDriverCode}`
                      : `Last: ${latest.status}`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!hasOpenAssignment && permissions.canAssign && (
                <Button type="button" onClick={() => setAssignOpen(true)}>
                  Assign driver
                </Button>
              )}
              {isOffered && permissions.canAssign && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWithdrawOpen(true)}
                >
                  Withdraw offer
                </Button>
              )}
              {(isOffered || isAccepted) && permissions.canReassign && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReassignOpen(true)}
                >
                  Reassign
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                <p className="mt-1">{addressLine(selectedOrder.pickupAddress)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Delivery</p>
                <p className="mt-1">{addressLine(selectedOrder.deliveryAddress)}</p>
              </div>
            </div>
            {selectedOrder.readyAt && (
              <p className="text-xs text-muted-foreground">
                Ready {formatDateTime(selectedOrder.readyAt)}
              </p>
            )}
            {tab === "ready" && isOffered && (
              <p className="text-xs text-muted-foreground">
                Offer pending — the driver has not accepted yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <AssignOrderDialog
        order={selectedOrder ? (selectedOrder as DispatchQueueOrder) : null}
        drivers={workloadsQuery.data ?? []}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />

      <ReassignDialog
        order={selectedOrder ? (selectedOrder as DispatchQueueOrder) : null}
        currentDriverCode={currentDriverCode}
        drivers={workloadsQuery.data ?? []}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
      />

      <WithdrawConfirmation
        assignmentId={currentAssignmentId}
        driverCode={currentDriverCode}
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
      />
    </div>
  );
}