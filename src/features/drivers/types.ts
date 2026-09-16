export const DRIVER_AVAILABILITY_STATES = [
  "Offline",
  "Available",
  "Assigned",
  "OnDelivery",
  "Unavailable",
] as const;

export type DriverAvailabilityState = (typeof DRIVER_AVAILABILITY_STATES)[number];

export interface DriverListItem {
  id: string;
  driverCode: string;
  accountId: string;
  contactPhone: string;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  qualification: string | null;
  active: boolean;
  state: DriverAvailabilityState;
  version: number;
  createdAt: string;
}

export interface DriverVehicle {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  status: string;
}

export interface DriverDetail extends DriverListItem {
  currentVehicle: DriverVehicle | null;
}

export interface DriverPageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DriverPage {
  data: DriverListItem[];
  meta: DriverPageMeta;
}

export interface DriverListPage {
  drivers: DriverListItem[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface DriverListFilters {
  state?: DriverAvailabilityState;
  active?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: string;
  roles: string[];
  version: number;
}

export interface UserSummaryPage {
  data: UserSummary[];
  meta: DriverPageMeta;
}
