import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type { DataResponse } from "@/lib/api/types";
import type { RoleListItem } from "./types";

/* -------------------------------------------------------------------------- */
/*  Roles (read-only; any authenticated user)                                  */
/* -------------------------------------------------------------------------- */

export function listRoles(
  userId?: string,
  opts?: ApiFetchOptions,
): Promise<DataResponse<RoleListItem[]>> {
  const qs = userId ? `?user=${encodeURIComponent(userId)}` : "";
  return apiFetch(`/roles${qs}`, opts);
}