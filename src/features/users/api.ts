import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type {
  CreateUserPayload,
  SetUserRolesPayload,
  UpdateUserPayload,
  UserDetail,
  UserListFilters,
  UserPage,
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
/*  Users (reads: users.view | users.manage; writes: users.manage)            */
/* -------------------------------------------------------------------------- */

export function listUsers(
  params: UserListFilters & { page?: number; pageSize?: number },
  opts?: ApiFetchOptions,
): Promise<UserPage> {
  return apiFetch(`/users${buildListQuery(params)}`, opts);
}

export function getUser(id: string, opts?: ApiFetchOptions): Promise<UserDetail> {
  return apiFetch(`/users/${id}`, opts);
}

export function createUser(
  data: CreateUserPayload,
  idempotencyKey?: string,
): Promise<UserDetail> {
  return apiFetch("/users", {
    method: "POST",
    body: JSON.stringify(data),
    idempotencyKey,
  });
}

export function updateUser(
  id: string,
  data: UpdateUserPayload,
  version: number,
): Promise<UserDetail> {
  return apiFetch(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    version,
  });
}

export function replaceUserRoles(
  id: string,
  data: SetUserRolesPayload,
): Promise<UserDetail> {
  return apiFetch(`/users/${id}/roles`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}