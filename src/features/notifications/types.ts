export type NotificationChannel = "InApp" | "Email";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  orderId: string | null;
  createdAt: string;
}

export interface NotificationListParams {
  cursor?: string;
  pageSize?: number;
  unreadOnly?: boolean;
}

export interface NotificationMarkedRead {
  id: string;
  readAt: string;
}

export interface MarkAllReadResult {
  updated: number;
}