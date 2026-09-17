import type { OrderStatus } from "@/features/orders/types";

export interface ReportMeta {
  timezone: string;
  dateBasis: string;
  filters: Record<string, unknown>;
  calculatedAt: string;
  metricVersion: string;
}

export interface DriverAvailability {
  total: number;
  available: number;
  assigned: number;
  onDelivery: number;
  offline: number;
  unavailable: number;
}

export interface StatusDistributionEntry {
  status: string;
  count: number;
}

export interface DriverPerformanceRow {
  driverId: string;
  driverCode: string;
  driverName: string;
  deliveries: number;
  onTime: number;
  onTimeRate: number | null;
}

export interface ZonePerformanceRow {
  zoneId: string | null;
  zoneName: string;
  deliveries: number;
  onTime: number;
  onTimeRate: number | null;
}

export interface DashboardMetrics {
  deliveriesToday: number;
  failedToday: number;
  pendingDeliveries: number;
  activeDeliveries: number;
  onTimeRate: number | null;
  onTimeNumerator: number;
  onTimeDenominator: number;
  excludedNoPromise: number;
  averageDeliveryTimeMs: number | null;
  deliveryRate: number | null;
  failedRate: number | null;
  driverAvailability: DriverAvailability;
  statusDistribution: StatusDistributionEntry[];
  driverPerformance: DriverPerformanceRow[];
  zonePerformance: ZonePerformanceRow[];
}

export interface DashboardReport {
  date: string;
  metrics: DashboardMetrics;
}

export interface DeliveryReportRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerId: string;
  customerName: string;
  zoneId: string | null;
  zoneName: string | null;
  createdAt: string;
  promisedAtStart: string | null;
  promisedAtEnd: string | null;
  rescheduledAtEnd: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  onTime: boolean | null;
  latenessMinutes: number | null;
  attemptCount: number;
}

export interface DeliveryReportSummary {
  totalOrders: number;
  delivered: number;
  failed: number;
  onTimeRate: number | null;
  deliveredLate: number;
  excludedNoPromise: number;
}

export interface DeliveryReportResponse {
  data: DeliveryReportRow[];
  summary: DeliveryReportSummary;
  meta: ReportMeta;
}

export interface DriverReportRow {
  driverId: string;
  driverCode: string;
  driverName: string;
  totalAssignments: number;
  accepted: number;
  rejected: number;
  expired: number;
  withdrawn: number;
  completed: number;
  onTime: number;
  onTimeRate: number | null;
  averageDeliveryTimeMin: number | null;
  rejectionRate: number | null;
}

export interface DriverReportSummary {
  totalDrivers: number;
  totalAssignments: number;
  completedAssignments: number;
}

export interface DriverReportResponse {
  data: DriverReportRow[];
  summary: DriverReportSummary;
  meta: ReportMeta;
}

export interface ZoneReportRow {
  zoneId: string | null;
  zoneName: string;
  totalOrders: number;
  delivered: number;
  failed: number;
  onTime: number;
  onTimeRate: number | null;
  averageDeliveryTimeMin: number | null;
  failedRate: number | null;
}

export interface ZoneReportSummary {
  totalZones: number;
  totalOrders: number;
}

export interface ZoneReportResponse {
  data: ZoneReportRow[];
  summary: ZoneReportSummary;
  meta: ReportMeta;
}

export interface DashboardReportParams {
  date?: string;
  timezone?: string;
}

export interface DeliveryReportParams {
  from: string;
  to: string;
  timezone?: string;
  zoneId?: string;
  status?: OrderStatus;
  customerId?: string;
}

export interface DriverReportParams {
  from: string;
  to: string;
  timezone?: string;
  driverId?: string;
}

export interface ZoneReportParams {
  from: string;
  to: string;
  timezone?: string;
  zoneId?: string;
}