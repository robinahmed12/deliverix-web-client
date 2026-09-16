import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type { CreateDriverInput, UpdateDriverInput } from "./schemas";
import type {
  DriverDetail,
  DriverListItem,
  DriverListFilters,
  DriverPage,
  UserSummaryPage,
} from "./types";

function buildListQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
}

/* -------------------------------------------------------------------------- */
/*  Drivers (drivers.view / drivers.manage)                                    */
/* -------------------------------------------------------------------------- */

export function listDrivers(
  params: Omit<DriverListFilters, "page"> & { page?: number },
  opts?: ApiFetchOptions,
): Promise<DriverPage> {
  const { page, ...rest } = params;
  return apiFetch(
    `/drivers${buildListQuery({ ...rest, page: page ?? 1, pageSize: params.pageSize ?? 20 })}`,
    opts,
  );
}

export function getDriver(
  id: string,
  opts?: ApiFetchOptions,
): Promise<DriverDetail> {
  return apiFetch(`/drivers/${id}`, opts);
}

export function createDriver(
  data: CreateDriverInput,
  idempotencyKey?: string,
): Promise<DriverListItem> {
  return apiFetch("/drivers", {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function updateDriver(
  id: string,
  data: UpdateDriverInput,
  version: number,
): Promise<DriverListItem> {
  return apiFetch(`/drivers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    version,
  });
}

/* -------------------------------------------------------------------------- */
/*  User accounts (account picker for driver creation)                         */
/* -------------------------------------------------------------------------- */

export function listUsers(
  params: { search?: string; page?: number; pageSize?: number; role?: string },
  opts?: ApiFetchOptions,
): Promise<UserSummaryPage> {
  return apiFetch(`/users${buildListQuery(params)}`, opts);
}