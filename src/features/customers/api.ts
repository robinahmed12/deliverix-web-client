import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type { DataResponse } from "@/lib/api/types";
import type {
  CustomerAddress,
  CustomerListItem,
  CustomerListFilters,
  CustomerPage,
  AddressPayload,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  CustomerProfile,
  UpdateMyProfilePayload,
  LinkAccountPayload,
  CancelOrderPayload,
} from "./types";

function buildListQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  return entries.length
    ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}`
    : "";
}

/* -------------------------------------------------------------------------- */
/*  Customers (customers.view / customers.manage)                              */
/* -------------------------------------------------------------------------- */

export function listCustomers(
  params: CustomerListFilters,
  opts?: ApiFetchOptions,
): Promise<CustomerPage> {
  return apiFetch(`/customers${buildListQuery(params)}`, opts);
}

export function getCustomer(id: string, opts?: ApiFetchOptions): Promise<CustomerListItem> {
  return apiFetch(`/customers/${id}`, opts);
}

export function createCustomer(
  data: CreateCustomerPayload,
  idempotencyKey?: string,
): Promise<CustomerListItem> {
  return apiFetch("/customers", {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function updateCustomer(
  id: string,
  data: UpdateCustomerPayload,
  version: number,
): Promise<CustomerListItem> {
  return apiFetch(`/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    version,
  });
}

/* -------------------------------------------------------------------------- */
/*  Address book                                                               */
/* -------------------------------------------------------------------------- */

export function listAddresses(
  customerId: string,
  opts?: ApiFetchOptions,
): Promise<DataResponse<CustomerAddress[]>> {
  return apiFetch(`/customers/${customerId}/addresses`, opts);
}

export function createAddress(
  customerId: string,
  data: AddressPayload,
  idempotencyKey?: string,
): Promise<CustomerAddress> {
  return apiFetch(`/customers/${customerId}/addresses`, {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function updateAddress(
  customerId: string,
  addressId: string,
  data: AddressPayload,
): Promise<CustomerAddress> {
  return apiFetch(`/customers/${customerId}/addresses/${addressId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAddress(
  customerId: string,
  addressId: string,
): Promise<void> {
  return apiFetch(`/customers/${customerId}/addresses/${addressId}`, {
    method: "DELETE",
  });
}

/* -------------------------------------------------------------------------- */
/*  Customer Self-Service (/customers/me)                                      */
/* -------------------------------------------------------------------------- */

export function getMyProfile(opts?: ApiFetchOptions): Promise<CustomerProfile> {
  return apiFetch("/customers/me", opts);
}

export function updateMyProfile(data: UpdateMyProfilePayload): Promise<CustomerListItem> {
  return apiFetch("/customers/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function linkCustomerAccount(data: LinkAccountPayload): Promise<CustomerListItem> {
  return apiFetch("/customers/me/link-account", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listMyAddresses(opts?: ApiFetchOptions): Promise<CustomerAddress[]> {
  const res = await apiFetch<DataResponse<CustomerAddress[]> | CustomerAddress[]>("/customers/me/addresses", opts);
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as DataResponse<CustomerAddress[]>).data)) {
    return (res as DataResponse<CustomerAddress[]>).data;
  }
  return [];
}

export function createMyAddress(
  data: AddressPayload,
  idempotencyKey?: string,
): Promise<CustomerAddress> {
  return apiFetch("/customers/me/addresses", {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function updateMyAddress(
  addressId: string,
  data: AddressPayload,
): Promise<CustomerAddress> {
  return apiFetch(`/customers/me/addresses/${addressId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteMyAddress(addressId: string): Promise<void> {
  return apiFetch(`/customers/me/addresses/${addressId}`, {
    method: "DELETE",
  });
}

export function customerCancelOrder(
  orderId: string,
  data: CancelOrderPayload,
  idempotencyKey?: string,
): Promise<unknown> {
  return apiFetch(`/orders/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}
