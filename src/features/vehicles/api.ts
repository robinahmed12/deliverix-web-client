import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type {
  AllocateVehicleInput,
  CreateVehicleInput,
  UpdateVehicleInput,
} from "./schemas";
import type {
  AllocationResult,
  VehicleDetail,
  VehicleListFilters,
  VehicleListItem,
  VehiclePage,
} from "./types";

function buildListQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
}

/* -------------------------------------------------------------------------- */
/*  Vehicles (drivers.view / drivers.manage / dispatch.view-queue)            */
/* -------------------------------------------------------------------------- */

export function listVehicles(
  params: Omit<VehicleListFilters, "page"> & { page?: number },
  opts?: ApiFetchOptions,
): Promise<VehiclePage> {
  const { page, ...rest } = params;
  return apiFetch(
    `/vehicles${buildListQuery({ ...rest, page: page ?? 1, pageSize: params.pageSize ?? 20 })}`,
    opts,
  );
}

export function getVehicle(id: string, opts?: ApiFetchOptions): Promise<VehicleDetail> {
  return apiFetch(`/vehicles/${id}`, opts);
}

export function createVehicle(
  data: CreateVehicleInput,
  idempotencyKey?: string,
): Promise<VehicleListItem> {
  return apiFetch("/vehicles", {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function updateVehicle(
  id: string,
  data: UpdateVehicleInput,
  version: number,
): Promise<VehicleListItem> {
  return apiFetch(`/vehicles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    version,
  });
}

export function allocateVehicle(
  id: string,
  data: AllocateVehicleInput,
  idempotencyKey?: string,
): Promise<AllocationResult> {
  return apiFetch(`/vehicles/${id}/allocate`, {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function deallocateVehicle(
  id: string,
  data: { driverId?: string },
  idempotencyKey?: string,
): Promise<{ released: number }> {
  return apiFetch(`/vehicles/${id}/deallocate`, {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}