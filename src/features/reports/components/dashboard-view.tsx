"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import { useDashboardReport } from "../queries";
import type { DashboardReport } from "../types";

function todayString(): string {
  const d = new Date();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function formatMinutes(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  return `${Math.round(ms / 60_000)} min`;
}

/** Rate coloring so good/bad performance reads instantly. */
function rateToneClass(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "text-muted-foreground";
  const pct = rate * 100;
  if (pct >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

const STATUS_BAR_COLORS: Record<string, string> = {
  Delivered: "bg-emerald-500",
  Pending: "bg-amber-500",
  ReadyForPickup: "bg-sky-500",
  Assigned: "bg-indigo-500",
  PickedUp: "bg-blue-500",
  InTransit: "bg-blue-600",
  OutForDelivery: "bg-cyan-600",
  Failed: "bg-red-500",
  ReturnInProgress: "bg-orange-500",
  Cancelled: "bg-zinc-400 dark:bg-zinc-600",
  Returned: "bg-zinc-500",
};

function statusBarColor(status: string): string {
  return STATUS_BAR_COLORS[status] ?? "bg-primary";
}

const DRIVER_STATE_COLORS: Record<DriverStateKey, string> = {
  available: "bg-emerald-500",
  onDelivery: "bg-blue-500",
  assigned: "bg-indigo-500",
  offline: "bg-muted-foreground/40",
  unavailable: "bg-zinc-400 dark:bg-zinc-600",
};

type DriverStateKey =
  | "available"
  | "onDelivery"
  | "assigned"
  | "offline"
  | "unavailable";

const DRIVER_STATE_LABELS: Record<DriverStateKey, string> = {
  available: "Available",
  onDelivery: "On delivery",
  assigned: "Assigned",
  offline: "Offline",
  unavailable: "Unavailable",
};

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2">
          {accent && (
            <span aria-hidden className={cn("size-2 rounded-full", accent)} />
          )}
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        </div>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function DashboardView({
  hasPermission,
  initialData,
}: {
  hasPermission: boolean;
  initialData?: DashboardReport;
}) {
  // Hour read once on the client so SSR/CSR agree (no hydration mismatch).
  const [greeting] = React.useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  });

  const [date, setDate] = React.useState<string>(() => todayString());

  const { data, isLoading, isFetching } = useDashboardReport(
    { date },
    initialData,
    hasPermission,
  );

  if (!hasPermission) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Dashboard metrics require the <span className="font-medium">reports.view</span>{" "}
        permission.
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No metrics available.
      </div>
    );
  }

  const m = data.metrics;
  const maxStatusCount = Math.max(1, ...m.statusDistribution.map((e) => e.count));

  const availability = m.driverAvailability;
  const driverTotal = Math.max(
    1,
    availability.available +
      availability.onDelivery +
      availability.assigned +
      availability.offline +
      availability.unavailable,
  );

  return (
    <div className="space-y-6">
      {/* Hero band */}
      <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground lg:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 85% 10%, rgb(255 255 255 / 14%), transparent 55%), radial-gradient(ellipse at 10% 100%, rgb(0 0 0 / 18%), transparent 55%)",
          }}
        />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary-foreground/60">
              Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
              {greeting} — here’s your operation today.
            </h1>
            <p className="mt-1 text-sm text-primary-foreground/70">
              Operational overview for your deliveries.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="hidden text-primary-foreground/70 sm:inline">
              Snapshot for
            </span>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44 border-transparent bg-background text-foreground shadow-sm"
            />
            {isFetching && (
              <span className="text-xs text-primary-foreground/70">
                Refreshing…
              </span>
            )}
          </label>
        </div>
      </section>

      {/* Leading KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Deliveries today"
          value={m.deliveriesToday}
          accent="bg-emerald-500"
          hint="Completed on the selected date"
        />
        <StatCard
          label="On-time rate"
          value={formatPercent(m.onTimeRate)}
          accent="bg-sky-500"
          hint={
            m.onTimeDenominator > 0
              ? `${m.onTimeNumerator}/${m.onTimeDenominator} within promise window`
              : undefined
          }
        />
        <StatCard
          label="Active deliveries"
          value={m.activeDeliveries}
          accent="bg-blue-500"
          hint="Picked up, in transit, or out for delivery"
        />
        <StatCard
          label="Drivers available"
          value={`${m.driverAvailability.available}/${m.driverAvailability.total}`}
          accent="bg-violet-500"
          hint={`${m.driverAvailability.onDelivery} on delivery now`}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending" value={m.pendingDeliveries} />
        <StatCard
          label="Average delivery time"
          value={formatMinutes(m.averageDeliveryTimeMs)}
        />
        <StatCard
          label="Delivery rate"
          value={formatPercent(m.deliveryRate)}
          hint={`${m.failedToday} failed today`}
        />
        <StatCard label="Failed rate" value={formatPercent(m.failedRate)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {m.statusDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No orders created on this date.
              </p>
            ) : (
              <div className="space-y-3">
                {m.statusDistribution.map((entry) => (
                  <div key={entry.status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{entry.status}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {entry.count}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          statusBarColor(entry.status),
                        )}
                        style={{ width: `${(entry.count / maxStatusCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Driver availability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {m.driverAvailability.available}
              <span className="text-lg text-muted-foreground">
                {" "}
                / {m.driverAvailability.total} available
              </span>
            </p>

            {/* Stacked share-of-fleet bar */}
            <div
              className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label="Share of drivers by state"
            >
              {(
                [
                  ["available", "bg-emerald-500"],
                  ["onDelivery", "bg-blue-500"],
                  ["assigned", "bg-indigo-500"],
                  ["offline", "bg-muted-foreground/40"],
                  ["unavailable", "bg-zinc-400 dark:bg-zinc-600"],
                ] as const
              ).map(([key, color]) => {
                const count = availability[key];
                if (count === 0) return null;
                return (
                  <div
                    key={key}
                    className={color}
                    style={{ width: `${(count / driverTotal) * 100}%` }}
                  />
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {(Object.entries(DRIVER_STATE_LABELS) as [DriverStateKey, string][]).map(
                ([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 rounded-full",
                          DRIVER_STATE_COLORS[key] ?? "bg-muted-foreground/40",
                        )}
                      />
                      {label}
                    </span>
                    <span className="tabular-nums font-medium">
                      {availability[key]}
                    </span>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Driver performance
            <Badge variant="secondary">Top {m.driverPerformance.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {m.driverPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed assignments on this date.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Deliveries</TableHead>
                  <TableHead className="text-right">On-time</TableHead>
                  <TableHead className="text-right">On-time rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.driverPerformance.map((row) => (
                  <TableRow key={row.driverId}>
                    <TableCell className="font-medium">
                      {row.driverName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {row.driverCode}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.deliveries}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.onTime}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        rateToneClass(row.onTimeRate),
                      )}
                    >
                      {formatPercent(row.onTimeRate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zone performance</CardTitle>
        </CardHeader>
        <CardContent>
          {m.zonePerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No delivered orders on this date.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead className="text-right">Deliveries</TableHead>
                  <TableHead className="text-right">On-time</TableHead>
                  <TableHead className="text-right">On-time rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.zonePerformance.map((row) => (
                  <TableRow key={row.zoneId ?? row.zoneName}>
                    <TableCell className="font-medium">
                      {row.zoneName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.deliveries}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.onTime}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        rateToneClass(row.onTimeRate),
                      )}
                    >
                      {formatPercent(row.onTimeRate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
