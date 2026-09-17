export const VEHICLE_OPERATIONAL_STATUSES = [
  "Active",
  "Maintenance",
  "Inactive",
] as const;

export type VehicleOperationalStatus = (typeof VEHICLE_OPERATIONAL_STATUSES)[number];

export interface VehicleListItem {
  id: string;
  registrationNumber: string;
  make: string | null;
  model: string | null;
  vehicleType: string;
  capacityValue: string;
  capacityUnit: string;
  status: VehicleOperationalStatus;
  qualification: string | null;
  version: number;
  createdAt: string;
}

export interface VehicleCurrentDriver {
  id: string;
  driverCode: string;
}

export interface VehicleDetail extends VehicleListItem {
  currentDriver: VehicleCurrentDriver | null;
}

export interface VehiclePageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface VehiclePage {
  data: VehicleListItem[];
  meta: VehiclePageMeta;
}

export interface VehicleListPage {
  vehicles: VehicleListItem[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface VehicleListFilters {
  status?: VehicleOperationalStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AllocationResult {
  id: string;
  vehicleId: string;
  driverId: string;
  assignedFrom: string;
  assignedTo: string | null;
}