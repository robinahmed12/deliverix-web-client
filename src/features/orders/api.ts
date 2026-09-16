import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type { DataResponse, PaginatedResponse } from "@/lib/api/types";
import type {
  CancelOrderInput,
  CreateOrderInput,
  UpdateOrderInput,
} from "./schemas";
import type {
  CustomerPageMeta,
  CustomerSummary,
  Order,
  OrderListParams,
  OrderNote,
  OrderStatusHistoryEntry,
  ServiceTypeSummary,
  ZoneSummary,
} from "./types";

function buildListQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
}

/* -------------------------------------------------------------------------- */
/*  Orders (orders.view / orders.create / orders.edit / orders.cancel)       */
/* -------------------------------------------------------------------------- */

export function listOrders(
  params: OrderListParams,
  opts?: ApiFetchOptions,
): Promise<PaginatedResponse<Order>> {
  return apiFetch(`/orders${buildListQuery(params)}`, opts);
}

export function getOrder(id: string, opts?: ApiFetchOptions): Promise<Order> {
  return apiFetch(`/orders/${id}`, opts);
}

export function createOrder(
  data: CreateOrderInput,
  idempotencyKey?: string,
): Promise<Order> {
  return apiFetch("/orders", {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function updateOrder(
  id: string,
  data: UpdateOrderInput,
  version: number,
): Promise<Order> {
  return apiFetch(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    version,
  });
}

export function markOrderReady(id: string): Promise<Order> {
  return apiFetch(`/orders/${id}/ready`, { method: "POST" });
}

export function cancelOrder(
  id: string,
  data: CancelOrderInput,
  version: number,
): Promise<Order> {
  return apiFetch(`/orders/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify(data),
    version,
  });
}

/* -------------------------------------------------------------------------- */
/*  History & Notes                                                          */
/* -------------------------------------------------------------------------- */

export async function getOrderHistory(
  id: string,
  opts?: ApiFetchOptions,
): Promise<OrderStatusHistoryEntry[]> {
  const res = await apiFetch<{ data: OrderStatusHistoryEntry[] }>(
    `/orders/${id}/history`,
    opts,
  );
  return res.data;
}

export function listOrderNotes(
  id: string,
  params?: { cursor?: string; pageSize?: number },
  opts?: ApiFetchOptions,
): Promise<PaginatedResponse<OrderNote>> {
  return apiFetch(`/orders/${id}/notes${buildListQuery(params ?? {})}`, opts);
}

export function createOrderNote(
  id: string,
  body: string,
  idempotencyKey?: string,
): Promise<OrderNote> {
  return apiFetch(`/orders/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ note: body }),
    idempotencyKey,
  });
}

/* -------------------------------------------------------------------------- */
/*  Reference pickers (customers / zones / service-types)                     */
/* -------------------------------------------------------------------------- */

export function listCustomers(
  params?: { search?: string; page?: number; pageSize?: number; status?: string },
  opts?: ApiFetchOptions,
): Promise<{ data: CustomerSummary[]; meta: CustomerPageMeta }> {
  return apiFetch(`/customers${buildListQuery(params ?? {})}`, opts);
}

export function listZones(
  opts?: ApiFetchOptions,
): Promise<DataResponse<ZoneSummary[]>> {
  return apiFetch("/zones", opts);
}

export function listServiceTypes(
  opts?: ApiFetchOptions,
): Promise<DataResponse<ServiceTypeSummary[]>> {
  return apiFetch("/service-types", opts);
}