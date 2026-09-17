import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type { DataResponse } from "@/lib/api/types";
import type {
  CreateZonePayload,
  UpdateZonePayload,
  ZoneDetail,
  ZoneFilters,
  ZoneListItem,
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
/*  Zones (reads: any authenticated user; writes: zones.manage)                */
/* -------------------------------------------------------------------------- */

export function listZones(
  params?: ZoneFilters,
  opts?: ApiFetchOptions,
): Promise<DataResponse<ZoneListItem[]>> {
  return apiFetch(`/zones${buildListQuery(params ?? {})}`, opts);
}

export function getZone(id: string, opts?: ApiFetchOptions): Promise<ZoneDetail> {
  return apiFetch(`/zones/${id}`, opts);
}

export function createZone(
  data: CreateZonePayload,
  idempotencyKey?: string,
): Promise<ZoneListItem> {
  return apiFetch("/zones", {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function updateZone(
  id: string,
  data: UpdateZonePayload,
  version: number,
): Promise<ZoneListItem> {
  return apiFetch(`/zones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    version,
  });
}