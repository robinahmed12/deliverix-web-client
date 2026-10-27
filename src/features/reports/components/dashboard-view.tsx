"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { useDashboardReport, useDeliveryReport } from "../queries";
import type { DashboardMetrics, DashboardReport, DeliveryReportRow } from "../types";

const TRENDS_WINDOW_DAYS = 14;
/** Bars at/above the target render blue, below it red — unless the user overrides. */
const DEFAULT_TARGET = 15;

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
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
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

/* ------------------------------------ */
/* Chart palette (raw hex: SVG fills)   */
/* ------------------------------------ */

const STATUS_HEX: Record<string, string> = {
  Delivered: "#10b981",
  Pending: "#f59e0b",
  ReadyForPickup: "#38bdf8",
  Assigned: "#6366f1",
  PickedUp: "#3b82f6",
  InTransit: "#2563eb",
  OutForDelivery: "#06b6d4",
  Failed: "#ef4444",
  ReturnInProgress: "#f97316",
  Cancelled: "#a1a1aa",
  Returned: "#71717a",
  Rescheduled: "#c084fc",
};

function statusHex(status: string): string {
  return STATUS_HEX[status] ?? "#7c3aed";
}

type DriverStateKey =
  | "available"
  | "onDelivery"
  | "assigned"
  | "offline"
  | "unavailable";

const DRIVER_STATE_COLORS: Record<DriverStateKey, string> = {
  available: "bg-emerald-500",
  onDelivery: "bg-blue-500",
  assigned: "bg-indigo-500",
  offline: "bg-muted-foreground/40",
  unavailable: "bg-zinc-400 dark:bg-zinc-600",
};

const DRIVER_STATE_LABELS: Record<DriverStateKey, string> = {
  available: "Available",
  onDelivery: "On delivery",
  assigned: "Assigned",
  offline: "Offline",
  unavailable: "Unavailable",
};

/* ------------------------------------ */
/* Chart theme tokens                   */
/* ------------------------------------ */

const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" };
const GRID_STROKE = "var(--border)";
const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

/* ---------------------------------------------------------------------- */
/* Multiple KPI Series: two or more related KPIs over a period of time,    */
/* plus the same KPI compared across a shared breakdown (zones)            */
/* ---------------------------------------------------------------------- */

const SERIES_PERIODS = [7, 14, 30] as const;

const SERIES_META = {
  created: { name: "Created", color: "#64748b", axis: "count" },
  delivered: { name: "Delivered", color: "#10b981", axis: "count" },
  failed: { name: "Failed", color: "#ef4444", axis: "count" },
  rate: { name: "On-time rate", color: "#f59e0b", axis: "rate" },
} as const;

type SeriesKey = keyof typeof SERIES_META;
const SERIES_KEYS = Object.keys(SERIES_META) as SeriesKey[];

const SERIES_DEFAULTS = new Set<SeriesKey>(SERIES_KEYS);

const ZONE_PALETTE = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];
const OTHERS_COLOR = "#a1a1aa";
const OTHERS_LABEL = "All others";

/**
 * Daily delivered counts per zone over the window. The busiest zones become
 * individual series; lower-volume zones are folded into "All others" so the
 * chart stays readable while still comparing one KPI across the breakdown.
 */
interface ZoneTrendSeries {
  points: Array<Record<string, number | string>>;
  lines: Array<{ name: string; color: string }>;
}

function buildZoneTrendSeries(
  rows: DeliveryReportRow[],
  fromDate: string,
  days: number,
): ZoneTrendSeries {
  const totals = new Map<string, number>();
  const buckets = new Map<string, number>(); // `${dayKey}|${zoneName}`

  for (const row of rows) {
    if (row.status !== "Delivered") continue;
    const zone = row.zoneName ?? "No zone";
    const day = (row.deliveredAt ?? row.createdAt).slice(0, 10);
    const key = `${day}|${zone}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    totals.set(zone, (totals.get(zone) ?? 0) + 1);
  }

  const ranked = Array.from(totals.entries())
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const top = ranked
    .slice(0, ZONE_PALETTE.length)
    .map(([name], i) => ({ name, color: ZONE_PALETTE[i] }));
  const topNames = new Set(top.map((t) => t.name));
  const othersTotal = ranked
    .slice(ZONE_PALETTE.length)
    .reduce((a, [, v]) => a + v, 0);
  const lines = [...top];
  if (othersTotal > 0) {
    lines.push({ name: OTHERS_LABEL, color: OTHERS_COLOR });
  }

  const startMs = Date.parse(`${fromDate}T00:00:00.000Z`);
  const points: Array<Record<string, number | string>> = [];
  const pointIndex = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(startMs + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    pointIndex.set(key, points.length);
    points.push({
      label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
    });
  }

  for (const [key, count] of buckets) {
    const sep = key.indexOf("|");
    const day = key.slice(0, sep);
    const zone = key.slice(sep + 1);
    const index = pointIndex.get(day);
    if (index === undefined) continue;
    // Zones outside the top N roll into the "All others" series.
    const target = topNames.has(zone) ? zone : OTHERS_LABEL;
    const current = points[index][target];
    points[index][target] = (typeof current === "number" ? current : 0) + count;
  }

  return { points, lines };
}

function MultipleKpiSeriesCard({ endDate }: { endDate: string }) {
  // Period of time the KPI relationship is evaluated over.
  const [period, setPeriod] = React.useState<number>(14);
  // Series picker (KPIs over time).
  const [selected, setSelected] = React.useState<ReadonlySet<SeriesKey>>(
    SERIES_DEFAULTS,
  );
  // "kpis" compares several related KPIs over time; "zones" compares one
  // KPI (daily delivered) across the same breakdown — both halves of the
  // Multi KPI series pattern.
  const [mode, setMode] = React.useState<"kpis" | "zones">("kpis");

  const range = React.useMemo(() => {
    const end = Date.parse(`${endDate}T00:00:00.000Z`);
    return {
      from: new Date(end - (period - 1) * 86_400_000)
        .toISOString()
        .slice(0, 10),
      to: new Date(end + (86_400_000 - 1)).toISOString().slice(0, 10),
    };
  }, [endDate, period]);

  const query = useDeliveryReport(range);
  const rows = query.data?.data ?? [];

  const kpiSeries = React.useMemo(
    () => buildTrendSeries(rows, range.from, period),
    [rows, range.from, period],
  );
  const zoneSeries = React.useMemo(
    () => buildZoneTrendSeries(rows, range.from, period),
    [rows, range.from, period],
  );

  const visibleSeries = SERIES_KEYS.filter((key) => selected.has(key));

  const toggleSeries = (key: SeriesKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Multiple KPI series</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "kpis"
              ? `Last ${period} days ending ${endDate} — counts (left) versus on-time rate (right)`
              : `Last ${period} days ending ${endDate} — daily delivered count per zone`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Compare mode */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={mode === "kpis"}
              onClick={() => setMode("kpis")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                mode === "kpis"
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              KPI trends
            </button>
            <button
              type="button"
              aria-pressed={mode === "zones"}
              onClick={() => setMode("zones")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                mode === "zones"
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              By zone
            </button>
          </div>
          {/* Period selector */}
          <div className="flex items-center gap-1">
            {SERIES_PERIODS.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={period === days}
                onClick={() => setPeriod(days)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  period === days
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {days}D
              </button>
            ))}
          </div>
          {query.isFetching && <Badge variant="secondary">Updating…</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI series picker (KPI mode only) */}
        {mode === "kpis" && (
          <div className="flex flex-wrap gap-2">
            {SERIES_KEYS.map((key) => {
              const on = selected.has(key);
              const meta = SERIES_META[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSeries(key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    on
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  {meta.name}
                </button>
              );
            })}
          </div>
        )}

        {query.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : mode === "kpis" && visibleSeries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Select at least one KPI series.
          </p>
        ) : mode === "zones" && zoneSeries.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No delivered orders in this window yet.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={
                  (mode === "kpis" ? kpiSeries : zoneSeries.points) as unknown as Array<
                    Record<string, number | string>
                  >
                }
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} />
                {mode === "kpis" &&
                  visibleSeries.some(
                    (k) => SERIES_META[k].axis === "count",
                  ) && (
                    <YAxis
                      yAxisId="count"
                      allowDecimals={false}
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                    />
                  )}
                {mode === "kpis" && visibleSeries.includes("rate") && (
                  <YAxis
                    yAxisId="rate"
                    orientation="right"
                    domain={[0, 100]}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                )}
                {mode === "zones" && (
                  <YAxis
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                  />
                )}
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {mode === "kpis"
                  ? visibleSeries.map((key) => {
                      const meta = SERIES_META[key];
                      return (
                        <Line
                          key={key}
                          yAxisId={meta.axis === "count" ? "count" : "rate"}
                          name={meta.name}
                          dataKey={key === "rate" ? "onTimeRate" : key}
                          stroke={meta.color}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                          strokeDasharray={key === "rate" ? "6 4" : undefined}
                        />
                      );
                    })
                  : zoneSeries.lines.map((line) => (
                      <Line
                        key={line.name}
                        name={line.name}
                        dataKey={line.name}
                        stroke={line.color}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------ */
/* 14-day trend series derivation       */
/* ------------------------------------ */

/**
 * One point per day over the lookback window, derived client-side from the
 * delivery report rows. Series intentionally mix loosely related metrics:
 * created / delivered / failed counts share the left axis while the on-time
 * rate climbs the right axis (Multi KPI Series pattern).
 */
interface TrendPoint {
  [key: string]: string | number | null;
  /** YYYY-MM-DD */
  date: string;
  /** Display label, e.g. "10/14" */
  label: string;
  created: number;
  delivered: number;
  failed: number;
  /** 0-100, null when no promise-window deliveries that day */
  onTimeRate: number | null;
}

function buildTrendSeries(
  rows: DeliveryReportRow[],
  fromDate: string,
  days: number,
): TrendPoint[] {
  interface Bucket {
    created: number;
    delivered: number;
    failed: number;
    onTime: number;
    promiseWindow: number;
  }

  const buckets = new Map<string, Bucket>();
  const points: TrendPoint[] = [];
  const startMs = Date.parse(`${fromDate}T00:00:00.000Z`);

  const bucketFor = (date: string): Bucket => {
    let b = buckets.get(date);
    if (!b) {
      b = { created: 0, delivered: 0, failed: 0, onTime: 0, promiseWindow: 0 };
      buckets.set(date, b);
    }
    return b;
  };

  for (const row of rows) {
    const b = bucketFor(row.createdAt.slice(0, 10));
    b.created += 1;
    if (row.status === "Delivered") {
      // Count deliveries on the day they were actually delivered (created
      // earlier is still fine: query window already includes both ends).
      bucketFor((row.deliveredAt ?? row.createdAt).slice(0, 10)).delivered += 1;
    } else if (row.status === "Failed") {
      b.failed += 1;
    }
    if (row.status === "Delivered" && row.promisedAtEnd !== null) {
      b.promiseWindow += 1;
      if (row.onTime === true) b.onTime += 1;
    }
  }

  for (let i = 0; i < days; i += 1) {
    const d = new Date(startMs + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const b = buckets.get(key) ?? {
      created: 0,
      delivered: 0,
      failed: 0,
      onTime: 0,
      promiseWindow: 0,
    };
    points.push({
      date: key,
      label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
      created: b.created,
      delivered: b.delivered,
      failed: b.failed,
      onTimeRate:
        b.promiseWindow > 0
          ? Math.round((b.onTime / b.promiseWindow) * 1000) / 10
          : null,
    });
  }
  return points;
}

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

/* ---------------------------------------------------------------------- */
/* Multiple KPI pie: loosely related KPIs combined as shares of their total */
/* ---------------------------------------------------------------------- */

interface KpiMixOption {
  key: string;
  label: string;
  color: string;
  read: (m: DashboardMetrics) => number;
}

const KPI_MIX_OPTIONS: KpiMixOption[] = [
  { key: "delivered", label: "Delivered today", color: "#10b981", read: (m) => m.deliveriesToday },
  { key: "active", label: "Active now", color: "#3b82f6", read: (m) => m.activeDeliveries },
  { key: "pending", label: "Pending", color: "#f59e0b", read: (m) => m.pendingDeliveries },
  { key: "failed", label: "Failed today", color: "#ef4444", read: (m) => m.failedToday },
  { key: "drivers", label: "Drivers available", color: "#8b5cf6", read: (m) => m.driverAvailability.available },
];

const KPI_MIX_DEFAULT = new Set(["delivered", "active", "pending", "failed", "drivers"]);

function KpiMixPie({ metrics }: { metrics: DashboardMetrics }) {
  // Which KPIs participate in the pie — selected by the user via the chips.
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(
    KPI_MIX_DEFAULT,
  );

  const entries = KPI_MIX_OPTIONS.filter((o) => selected.has(o.key)).map((o) => ({
    key: o.key,
    name: o.label,
    color: o.color,
    value: o.read(metrics),
  }));
  const total = entries.reduce((a, e) => a + e.value, 0);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multiple KPIs</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Unrelated KPIs of today's snapshot combined — each slice is its share
          of the combined total. Toggle the chips to choose the participants.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI chooser */}
        <div className="flex flex-wrap gap-2">
          {KPI_MIX_OPTIONS.map((option) => {
            const on = selected.has(option.key);
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(option.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  on
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                {option.label}
              </button>
            );
          })}
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Select at least one KPI to build the chart.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-6 md:flex-row">
            {/* Donut with the combined total in the hole */}
            <div className="relative h-64 w-64 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={entries}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {entries.map((e) => (
                      <Cell key={e.key} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value, name) => [
                      `${value} (${Math.round((Number(value) / total) * 100)}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
              >
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Combined
                </span>
                <span className="text-2xl font-semibold tabular-nums">
                  {total}
                </span>
              </div>
            </div>

            {/* Values + shares */}
            <ul className="w-full flex-1 space-y-1.5 text-sm">
              {entries.map((e) => (
                <li
                  key={e.key}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: e.color }}
                    />
                    <span className="truncate">{e.name}</span>
                  </span>
                  <span className="tabular-nums font-medium">{e.value}</span>
                  <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                    {total > 0 ? `${Math.round((e.value / total) * 100)}%` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
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

  // Target-chart window: the selected date is the last day of the lookback
  // window, so the chart and the KPI snapshot read off the same reference day.
  const trendsRange = React.useMemo(() => {
    const end = Date.parse(`${date}T00:00:00.000Z`);
    const from = new Date(end - (TRENDS_WINDOW_DAYS - 1) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const to = new Date(end + (86_400_000 - 1)).toISOString().slice(0, 10);
    return { from, to };
  }, [date]);

  // Feeds the "daily deliveries vs target" chart; shares the dashboard's
  // permission gate (reports.view). A bounded 14-day window sits well inside
  // the endpoint's 1000-row cap. The Multiple KPI series card fetches its own
  // (possibly different) window.
  const trendsQuery = useDeliveryReport(trendsRange, undefined, hasPermission);
  const trendRows = trendsQuery.data?.data ?? [];

  const trendSeries = React.useMemo(
    () => buildTrendSeries(trendRows, trendsRange.from, TRENDS_WINDOW_DAYS),
    [trendRows, trendsRange.from],
  );

  // Target defaults to the average daily delivery count of the window and
  // can be overridden inline; "" means "follow the average".
  const [targetInput, setTargetInput] = React.useState<string>("");
  const avgDelivered =
    trendSeries.length > 0
      ? trendSeries.reduce((a, p) => a + p.delivered, 0) / trendSeries.length
      : 0;
  const autoTarget = Math.max(1, Math.round(avgDelivered));
  const target = targetInput !== "" ? Number(targetInput) || autoTarget : autoTarget;

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

  const pieData = m.statusDistribution.map((e) => ({
    status: e.status,
    count: e.count,
    color: statusHex(e.status),
  }));
  const pieTotal = pieData.reduce((a, e) => a + e.count, 0);

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

      {/* Multiple KPI pie: unrelated KPIs as shares of their combined total */}
      <KpiMixPie metrics={m} />

      {/* Multiple KPI Series: several KPIs over time + zone breakdown */}
      <MultipleKpiSeriesCard endDate={data.date} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie of order-status KPIs */}
        <Card>
          <CardHeader>
            <CardTitle>Status distribution</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Orders created on {data.date}, share by status
            </p>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 || pieTotal === 0 ? (
              <p className="text-sm text-muted-foreground">
                No orders created on this date.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-64 w-full max-w-64 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.status} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value, name) => [
                          `${value} (${((Number(value) / pieTotal) * 100).toFixed(0)}%)`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full flex-1 space-y-1.5 text-sm sm:max-w-48">
                  {pieData.map((entry) => (
                    <li
                      key={entry.status}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="truncate">{entry.status}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {entry.count}
                      </span>
                    </li>
                  ))}
                </ul>
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

      {/* Trend chart: daily deliveries vs target (below = red, at/above = blue) */}
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Daily deliveries vs target</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Last {TRENDS_WINDOW_DAYS} days — red bars missed the target,
              blue bars met it
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Target / day</span>
            <Input
              type="number"
              min={0}
              className="w-24"
              value={targetInput !== "" ? targetInput : target}
              onChange={(e) => setTargetInput(e.target.value)}
            />
          </label>
        </CardHeader>
        <CardContent>
          {trendsQuery.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={trendSeries}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} />
                  <YAxis
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    y={target}
                    stroke="#0ea5e9"
                    strokeDasharray="6 4"
                    label={{
                      value: `Target ${target}`,
                      position: "insideTopRight",
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                    }}
                  />
                  <Bar
                    name="Deliveries"
                    dataKey="delivered"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  >
                    {trendSeries.map((p) => (
                      <Cell
                        key={p.date}
                        fill={p.delivered >= target ? "#3b82f6" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

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
