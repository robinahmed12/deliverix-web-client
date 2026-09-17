import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type {
  DashboardReport,
  DashboardReportParams,
  DeliveryReportParams,
  DeliveryReportResponse,
  DriverReportParams,
  DriverReportResponse,
  ZoneReportParams,
  ZoneReportResponse,
} from "./types";

function buildQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  return entries.length
    ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}`
    : "";
}

/* -------------------------------------------------------------------------- */
/*  Reports (`reports.view`)                                                  */
/* -------------------------------------------------------------------------- */

export function getDashboardReport(
  params: DashboardReportParams = {},
  opts?: ApiFetchOptions,
): Promise<DashboardReport> {
  return apiFetch(`/reports/dashboard${buildQuery(params)}`, opts);
}

export function getDeliveryReport(
  params: DeliveryReportParams,
  opts?: ApiFetchOptions,
): Promise<DeliveryReportResponse> {
  return apiFetch(`/reports/deliveries${buildQuery(params)}`, opts);
}

export function getDriverReport(
  params: DriverReportParams,
  opts?: ApiFetchOptions,
): Promise<DriverReportResponse> {
  return apiFetch(`/reports/drivers${buildQuery(params)}`, opts);
}

export function getZoneReport(
  params: ZoneReportParams,
  opts?: ApiFetchOptions,
): Promise<ZoneReportResponse> {
  return apiFetch(`/reports/zones${buildQuery(params)}`, opts);
}