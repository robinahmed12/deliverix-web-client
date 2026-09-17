import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type { DataResponse } from "@/lib/api/types";
import type {
  CreateServiceTypeInput,
  UpdateServiceTypeInput,
} from "./schemas";
import type {
  ServiceTypeFilters,
  ServiceTypeListItem,
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
/*  Service types (reads: any authenticated user; writes: config.manage)       */
/* -------------------------------------------------------------------------- */

export function listServiceTypes(
  params?: ServiceTypeFilters,
  opts?: ApiFetchOptions,
): Promise<DataResponse<ServiceTypeListItem[]>> {
  return apiFetch(`/service-types${buildListQuery(params ?? {})}`, opts);
}

export function getServiceType(
  id: string,
  opts?: ApiFetchOptions,
): Promise<ServiceTypeListItem> {
  return apiFetch(`/service-types/${id}`, opts);
}

export function createServiceType(
  data: CreateServiceTypeInput,
  idempotencyKey?: string,
): Promise<ServiceTypeListItem> {
  return apiFetch("/service-types", {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function updateServiceType(
  id: string,
  data: UpdateServiceTypeInput,
  version: number,
): Promise<ServiceTypeListItem> {
  return apiFetch(`/service-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    version,
  });
}