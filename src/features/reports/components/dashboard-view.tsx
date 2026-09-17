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

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
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
      <div className="space-y-4">
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">For date</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </label>
        {isFetching && (
          <span className="text-xs text-muted-foreground">Refreshing…</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Deliveries today" value={m.deliveriesToday} />
        <MetricCard
          label="On-time rate"
          value={formatPercent(m.onTimeRate)}
          hint={
            m.onTimeDenominator > 0
              ? `${m.onTimeNumerator}/${m.onTimeDenominator} within promise window`
              : undefined
          }
        />
        <MetricCard
          label="Average delivery time"
          value={formatMinutes(m.averageDeliveryTimeMs)}
        />
        <MetricCard
          label="Delivery rate"
          value={formatPercent(m.deliveryRate)}
          hint={`${m.failedToday} failed`}
        />
        <MetricCard label="Pending" value={m.pendingDeliveries} />
        <MetricCard label="Active" value={m.activeDeliveries} />
        <MetricCard
          label="Failed rate"
          value={formatPercent(m.failedRate)}
        />
        <MetricCard
          label="Drivers available"
          value={`${m.driverAvailability.available}/${m.driverAvailability.total}`}
          hint={`${m.driverAvailability.onDelivery} on delivery`}
        />
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
              <div className="space-y-2">
                {m.statusDistribution.map((entry) => (
                  <div
                    key={entry.status}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{entry.status}</span>
                    <span className="text-muted-foreground">
                      {entry.count}
                    </span>
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
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Available</span>
              <span className="text-right">{m.driverAvailability.available}</span>
              <span className="text-muted-foreground">On delivery</span>
              <span className="text-right">{m.driverAvailability.onDelivery}</span>
              <span className="text-muted-foreground">Assigned</span>
              <span className="text-right">{m.driverAvailability.assigned}</span>
              <span className="text-muted-foreground">Offline</span>
              <span className="text-right">{m.driverAvailability.offline}</span>
              <span className="text-muted-foreground">Unavailable</span>
              <span className="text-right">{m.driverAvailability.unavailable}</span>
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
                    <TableCell className="text-right">
                      {row.deliveries}
                    </TableCell>
                    <TableCell className="text-right">{row.onTime}</TableCell>
                    <TableCell className="text-right">
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
                    <TableCell className="text-right">
                      {row.deliveries}
                    </TableCell>
                    <TableCell className="text-right">{row.onTime}</TableCell>
                    <TableCell className="text-right">
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