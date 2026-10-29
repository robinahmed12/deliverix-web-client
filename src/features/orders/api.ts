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
  DeliveryProof,
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

export function listOrderProofs(
  id: string,
  params?: { cursor?: string; pageSize?: number },
  opts?: ApiFetchOptions,
): Promise<PaginatedResponse<DeliveryProof>> {
  return apiFetch(`/orders/${id}/proofs${buildListQuery(params ?? {})}`, opts);
}

/* -------------------------------------------------------------------------- */
/*  Driver delivery execution (deliveries.execute)                            */
/* -------------------------------------------------------------------------- */

export interface UploadProofFileResult {
  id: string;
  key: string;
  status: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

/**
 * Upload a POD photo for an order (POST /api/v1/files/upload).
 * The backend enforces JPEG/PNG, 5MB max, and links the file to the order.
 * The returned file id is used as `fileIds` when submitting Photo evidence.
 */
export function uploadProofFile(
  orderId: string,
  file: File,
  idempotencyKey?: string,
): Promise<UploadProofFileResult> {
  const form = new FormData();
  form.append("orderId", orderId);
  form.append("file", file);
  return apiFetch("/files/upload", {
    method: "POST",
    body: form,
    idempotencyKey,
  });
}

export type SubmitProofInput =
  | { evidenceType: "RecipientName"; evidenceValue: string }
  | { evidenceType: "Photo"; fileIds: string[] }
  | { evidenceType: "Signature"; fileIds: string[] }
  | { evidenceType: "ConfirmationFlag"; confirmationFlag: true }
  | { evidenceType: "Otp"; evidenceValue: string };

export interface SubmitProofResult {
  id?: string;
  evidenceType: string;
  status: string;
  submittedAt: string;
}

/** Submit one piece of delivery evidence (POST /api/v1/orders/:id/proofs). */
export function submitOrderProof(
  id: string,
  data: SubmitProofInput,
  idempotencyKey?: string,
): Promise<SubmitProofResult[] | SubmitProofResult> {
  return apiFetch(`/orders/${id}/proofs`, {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export interface OtpChallengeResult {
  challengeId: string;
  expiresAt: string;
}

/** Request a delivery OTP challenge (POST /api/v1/orders/:id/proofs/otp). */
export function requestDeliveryOtp(id: string): Promise<OtpChallengeResult> {
  return apiFetch(`/orders/${id}/proofs/otp`, { method: "POST" });
}

/**
 * Mark the order Delivered (POST /api/v1/orders/:id/deliver).
 * Requires `If-Match` with the current order version (428 without, 412 stale).
 * The backend validates the required POD evidence for the active attempt.
 */
export function completeDelivery(id: string, version: number): Promise<Order> {
  return apiFetch(`/orders/${id}/deliver`, {
    method: "POST",
    body: JSON.stringify({}),
    version,
  });
}

/* -------------------------------------------------------------------------- */
/*  Upload quota management (uploads not attached to evidence)                */
/* -------------------------------------------------------------------------- */

export interface UnlinkedUpload {
  id: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
  status: string;
  uploadedAt: string;
}

/**
 * Uploads for an order that are NOT attached to submitted evidence.
 * Orders have a per-order upload ceiling; unused uploads can be discarded
 * through DELETE /files/:id to free quota (rejected files stop counting).
 */
export async function listUnlinkedUploads(
  orderId: string,
  opts?: ApiFetchOptions,
): Promise<UnlinkedUpload[]> {
  const res = await apiFetch<{ data: UnlinkedUpload[] }>(
    `/files?orderId=${orderId}`,
    opts,
  );
  return res.data ?? [];
}

/** Discard one unlinked upload (never a file that evidence references). */
export function discardProofFile(fileId: string): Promise<{ id: string; status: string }> {
  return apiFetch(`/files/${fileId}`, { method: "DELETE" });
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