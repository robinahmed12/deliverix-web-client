"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils/formatters";
import { ORDER_STATUSES } from "@/features/orders/types";
import { useZones } from "@/features/orders/queries";
import { reportRangeSchema } from "../schemas";
import { useDeliveryReport, useDriverReport, useZoneReport, useDriverOptions } from "../queries";
import type {
  DeliveryReportRow,
  DeliveryReportSummary,
  DriverReportRow,
  DriverReportSummary,
  ZoneReportRow,
  ZoneReportSummary,
} from "../types";
import type { OrderStatus } from "@/features/orders/types";

type ReportTab = "deliveries" | "drivers" | "zones";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "deliveries", label: "Deliveries" },
  { id: "drivers", label: "Drivers" },
  { id: "zones", label: "Zones" },
];

function todayString(): string {
  const d = new Date();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

export function ReportsExplorer() {
  const [tab, setTab] = React.useState<ReportTab>("deliveries");
  const [from, setFrom] = React.useState<string>(() => daysAgo(30));
  const [to, setTo] = React.useState<string>(() => todayString());
  const [zoneId, setZoneId] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("");
  const [driverId, setDriverId] = React.useState<string>("");

  const zonesQuery = useZones();
  const driversQuery = useDriverOptions();

  const range = reportRangeSchema.safeParse({ from, to });
  const rangeError = range.success ? null : range.error.issues[0]?.message ?? "Invalid date range.";

  const deliveryParams =
    tab === "deliveries" && range.success
      ? {
          from,
          to,
          ...(zoneId ? { zoneId } : {}),
          ...(status ? { status: status as OrderStatus } : {}),
        }
      : null;

  const driverReportParams =
    tab === "drivers" && range.success
      ? { from, to, ...(driverId ? { driverId } : {}) }
      : null;

  const zoneReportParams =
    tab === "zones" && range.success
      ? { from, to, ...(zoneId ? { zoneId } : {}) }
      : null;

  const deliveriesQuery = useDeliveryReport(deliveryParams);
  const driversReportQuery = useDriverReport(driverReportParams);
  const zonesReportQuery = useZoneReport(zoneReportParams);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">From</span>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">To</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40"
          />
        </label>
        {tab !== "drivers" && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Zone</span>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">All zones</option>
              {(zonesQuery.data ?? []).map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {tab === "deliveries" && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        {tab === "drivers" && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Driver</span>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">All drivers</option>
              {(driversQuery.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.driverCode}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {rangeError && (
        <p className="text-sm text-destructive">{rangeError}</p>
      )}

      {tab === "deliveries" && (
        <DeliveryReportTable
          isLoading={deliveriesQuery.isLoading}
          data={deliveriesQuery.data?.data}
          summary={deliveriesQuery.data?.summary}
        />
      )}
      {tab === "drivers" && (
        <DriverReportTable
          isLoading={driversReportQuery.isLoading}
          data={driversReportQuery.data?.data}
          summary={driversReportQuery.data?.summary}
        />
      )}
      {tab === "zones" && (
        <ZoneReportTable
          isLoading={zonesReportQuery.isLoading}
          data={zonesReportQuery.data?.data}
          summary={zonesReportQuery.data?.summary}
        />
      )}
    </div>
  );
}

function SummaryBar({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item.label} variant="secondary">
          {item.label}: {item.value}
        </Badge>
      ))}
    </div>
  );
}

function DeliveryReportTable({
  isLoading,
  data,
  summary,
}: {
  isLoading: boolean;
  data: DeliveryReportRow[] | undefined;
  summary: DeliveryReportSummary | undefined;
}) {
  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Loading report…</p>;
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No orders in the selected range.
      </p>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery report</CardTitle>
        {summary && (
          <SummaryBar
            items={[
              { label: "Total", value: String(summary.totalOrders) },
              { label: "Delivered", value: String(summary.delivered) },
              { label: "Failed", value: String(summary.failed) },
              { label: "On-time rate", value: formatPercent(summary.onTimeRate) },
            ]}
          />
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Delivered</TableHead>
              <TableHead className="text-right">On-time</TableHead>
              <TableHead className="text-right">Late (min)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {row.orderNumber}
                </TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.customerName}</TableCell>
                <TableCell>{row.zoneName ?? "—"}</TableCell>
                <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                <TableCell>
                  {row.deliveredAt ? formatDateTime(row.deliveredAt) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {row.onTime === null ? "—" : row.onTime ? "Yes" : "No"}
                </TableCell>
                <TableCell className="text-right">
                  {row.latenessMinutes === null
                    ? "—"
                    : row.latenessMinutes}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DriverReportTable({
  isLoading,
  data,
  summary,
}: {
  isLoading: boolean;
  data: DriverReportRow[] | undefined;
  summary: DriverReportSummary | undefined;
}) {
  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Loading report…</p>;
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No driver assignments in the selected range.
      </p>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver report</CardTitle>
        {summary && (
          <SummaryBar
            items={[
              { label: "Drivers", value: String(summary.totalDrivers) },
              { label: "Assignments", value: String(summary.totalAssignments) },
              { label: "Completed", value: String(summary.completedAssignments) },
            ]}
          />
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead className="text-right">Assignments</TableHead>
              <TableHead className="text-right">Accepted</TableHead>
              <TableHead className="text-right">Rejected</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">On-time rate</TableHead>
              <TableHead className="text-right">Avg time (min)</TableHead>
              <TableHead className="text-right">Rejection</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.driverId}>
                <TableCell className="font-medium">
                  {row.driverName}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {row.driverCode}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {row.totalAssignments}
                </TableCell>
                <TableCell className="text-right">{row.accepted}</TableCell>
                <TableCell className="text-right">{row.rejected}</TableCell>
                <TableCell className="text-right">{row.completed}</TableCell>
                <TableCell className="text-right">
                  {formatPercent(row.onTimeRate)}
                </TableCell>
                <TableCell className="text-right">
                  {row.averageDeliveryTimeMin ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent(row.rejectionRate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ZoneReportTable({
  isLoading,
  data,
  summary,
}: {
  isLoading: boolean;
  data: ZoneReportRow[] | undefined;
  summary: ZoneReportSummary | undefined;
}) {
  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Loading report…</p>;
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No orders in the selected range.
      </p>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zone report</CardTitle>
        {summary && (
          <SummaryBar
            items={[
              { label: "Zones", value: String(summary.totalZones) },
              { label: "Orders", value: String(summary.totalOrders) },
            ]}
          />
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zone</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead className="text-right">Failed</TableHead>
              <TableHead className="text-right">On-time rate</TableHead>
              <TableHead className="text-right">Avg time (min)</TableHead>
              <TableHead className="text-right">Failed rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.zoneId ?? row.zoneName}>
                <TableCell className="font-medium">{row.zoneName}</TableCell>
                <TableCell className="text-right">{row.totalOrders}</TableCell>
                <TableCell className="text-right">{row.delivered}</TableCell>
                <TableCell className="text-right">{row.failed}</TableCell>
                <TableCell className="text-right">
                  {formatPercent(row.onTimeRate)}
                </TableCell>
                <TableCell className="text-right">
                  {row.averageDeliveryTimeMin ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent(row.failedRate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}