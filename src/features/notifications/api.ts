import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type {
  AppNotification,
  MarkAllReadResult,
  NotificationListParams,
  NotificationMarkedRead,
} from "./types";
import type { PaginatedResponse } from "@/lib/api/types";

function buildQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  return entries.length
    ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}`
    : "";
}

/* -------------------------------------------------------------------------- */
/*  Notifications (authenticated, self-scoped)                                 */
/* -------------------------------------------------------------------------- */

export function listNotifications(
  params: NotificationListParams = {},
  opts?: ApiFetchOptions,
): Promise<PaginatedResponse<AppNotification>> {
  return apiFetch(`/notifications${buildQuery(params)}`, opts);
}

export function markNotificationRead(
  id: string,
): Promise<NotificationMarkedRead> {
  return apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<MarkAllReadResult> {
  return apiFetch("/notifications/read-all", { method: "PATCH" });
}