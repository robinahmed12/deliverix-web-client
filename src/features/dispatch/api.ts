import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type {
  AssignOrderInput,
  ReassignInput,
  WithdrawAssignmentInput,
} from "./schemas";
import type {
  AssignmentHistoryResponse,
  DispatchQueuePage,
  DriverWorkloadsResponse,
} from "./types";

function buildListQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
}

/* -------------------------------------------------------------------------- */
/*  Dispatch reads (dispatch.view-queue)                                       */
/* -------------------------------------------------------------------------- */

export function listDispatchQueue(
  params: { cursor?: string; pageSize?: number; zoneId?: string },
  opts?: ApiFetchOptions,
): Promise<DispatchQueuePage> {
  return apiFetch(`/dispatch/queue${buildListQuery(params)}`, opts);
}

export function listDriverWorkloads(
  params: { state?: string },
  opts?: ApiFetchOptions,
): Promise<DriverWorkloadsResponse> {
  return apiFetch(`/dispatch/workloads${buildListQuery(params)}`, opts);
}

export function getAssignmentHistory(
  orderId: string,
  opts?: ApiFetchOptions,
): Promise<AssignmentHistoryResponse> {
  return apiFetch(`/dispatch/orders/${orderId}/assignments`, opts);
}

/* -------------------------------------------------------------------------- */
/*  Assignment mutations                                                       */
/* -------------------------------------------------------------------------- */

export function createAssignment(
  orderId: string,
  data: AssignOrderInput,
  idempotencyKey?: string,
): Promise<Record<string, unknown>> {
  return apiFetch(`/orders/${orderId}/assignments`, {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function reassignOrder(
  orderId: string,
  data: ReassignInput,
  idempotencyKey?: string,
): Promise<Record<string, unknown>> {
  return apiFetch(`/orders/${orderId}/reassign`, {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function withdrawAssignment(
  id: string,
  data: WithdrawAssignmentInput,
  idempotencyKey?: string,
): Promise<Record<string, unknown>> {
  return apiFetch(`/assignments/${id}/withdraw`, {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function acceptAssignment(id: string): Promise<Record<string, unknown>> {
  return apiFetch(`/assignments/${id}/accept`, { method: "POST" });
}

export function rejectAssignment(id: string): Promise<Record<string, unknown>> {
  return apiFetch(`/assignments/${id}/reject`, { method: "POST" });
}