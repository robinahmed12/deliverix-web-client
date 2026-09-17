import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markNotificationRead as apiMarkNotificationRead,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
} from "./api";
import type { NotificationListParams } from "./types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params: NotificationListParams) =>
    ["notifications", "list", params] as const,
  unread: ["notifications", "unread"] as const,
} as const;

export function useNotifications(params: NotificationListParams = {}) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => listNotifications(params),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: async () => {
      const result = await listNotifications({ unreadOnly: true, pageSize: 20 });
      return result.meta.total ?? result.data.length;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

function invalidateNotifications(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiMarkNotificationRead,
    onSuccess: () => invalidateNotifications(qc),
  });
}

export function useMarkAllNotificationsReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiMarkAllNotificationsRead,
    onSuccess: () => invalidateNotifications(qc),
  });
}