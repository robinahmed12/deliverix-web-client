export const CUSTOMER_STATUSES = ["active", "inactive"] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export interface CustomerListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: CustomerStatus;
  accountId: string | null;
  version: number;
  createdAt: string;
}

/** The backend's customer detail DTO matches the list item shape. */
export type CustomerDetail = CustomerListItem;

export interface CustomerAddress {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  version: number;
}

export interface CustomerPageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CustomerPage {
  data: CustomerListItem[];
  meta: CustomerPageMeta;
}

export interface CustomerListPage {
  customers: CustomerListItem[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CustomerListFilters {
  status?: CustomerStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

/* -------------------------------------------------------------------------- */
/*  Wire payload types (backend `customers.schemas` mirror)                    */
/* -------------------------------------------------------------------------- */

export interface CreateCustomerPayload {
  name: string;
  email?: string;
  phone?: string;
}

export interface UpdateCustomerPayload {
  name?: string;
  email?: string | null;
  phone?: string | null;
  status?: CustomerStatus;
}

export interface AddressPayload {
  label?: string | null;
  line1?: string;
  line2?: string | null;
  city?: string;
  region?: string | null;
  postalCode?: string | null;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}