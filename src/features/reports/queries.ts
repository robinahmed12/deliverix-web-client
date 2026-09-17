import { useQuery } from "@tanstack/react-query";
import { listDrivers } from "@/features/drivers/api";
import {
  getDashboardReport,
  getDeliveryReport,
  getDriverReport,
  getZoneReport,
} from "./api";
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

export const reportKeys = {
  all: ["reports"] as const,
  driverOptions: ["reports", "driverOptions"] as const,
  dashboard: (params: DashboardReportParams) =>
    ["reports", "dashboard", params] as const,
  deliveries: (params: DeliveryReportParams) =>
    ["reports", "deliveries", params] as const,
  drivers: (params: DriverReportParams) =>
    ["reports", "drivers", params] as const,
  zones: (params: ZoneReportParams) =>
    ["reports", "zones", params] as const,
} as const;

export function useDriverOptions() {
  return useQuery({
    queryKey: reportKeys.driverOptions,
    queryFn: async () => {
      const result = await listDrivers({ active: true, pageSize: 100 });
      return result.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useDashboardReport(
  params: DashboardReportParams,
  initialData?: DashboardReport,
  enabled = true,
) {
  return useQuery({
    queryKey: reportKeys.dashboard(params),
    queryFn: () => getDashboardReport(params),
    initialData,
    enabled,
    staleTime: 60_000,
  });
}

export function useDeliveryReport(
  params: DeliveryReportParams | null,
  initialData?: DeliveryReportResponse,
) {
  return useQuery({
    queryKey: reportKeys.deliveries(params ?? { from: "", to: "" }),
    queryFn: () => getDeliveryReport(params as DeliveryReportParams),
    enabled: params !== null,
    initialData,
    staleTime: 60_000,
  });
}

export function useDriverReport(
  params: DriverReportParams | null,
  initialData?: DriverReportResponse,
) {
  return useQuery({
    queryKey: reportKeys.drivers(params ?? { from: "", to: "" }),
    queryFn: () => getDriverReport(params as DriverReportParams),
    enabled: params !== null,
    initialData,
    staleTime: 60_000,
  });
}

export function useZoneReport(
  params: ZoneReportParams | null,
  initialData?: ZoneReportResponse,
) {
  return useQuery({
    queryKey: reportKeys.zones(params ?? { from: "", to: "" }),
    queryFn: () => getZoneReport(params as ZoneReportParams),
    enabled: params !== null,
    initialData,
    staleTime: 60_000,
  });
}