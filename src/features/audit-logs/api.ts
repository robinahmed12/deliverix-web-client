import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type { PaginatedResponse } from "@/lib/api/types";
import type { AuditListParams, AuditLogEntry } from "./types";

function buildQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  return entries.length
    ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}`
    : "";
}

/* -------------------------------------------------------------------------- */
/*  Audit log (audit.view) — read-only search                                  */
/* -------------------------------------------------------------------------- */

export function listAuditLogs(
  params: AuditListParams = {},
  opts?: ApiFetchOptions,
): Promise<PaginatedResponse<AuditLogEntry>> {
  return apiFetch(`/audit-logs${buildQuery(params)}`, opts);
}