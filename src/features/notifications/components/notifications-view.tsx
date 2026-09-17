"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/formatters";
import {
  useNotifications,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../queries";
import type { AppNotification } from "../types";

export function NotificationsView() {
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const notificationsQuery = useNotifications({ unreadOnly, pageSize: 100 });
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();

  const items = notificationsQuery.data?.data ?? [];

  const handleMarkAll = () => {
    if (items.some((n) => !n.readAt)) {
      markAllRead.mutate();
    }
  };

  const handleOpen = (n: AppNotification) => {
    if (!n.readAt && !markRead.isPending) {
      markRead.mutate(n.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUnreadOnly((v) => !v)}
          >
            Unread only
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={!items.some((n) => !n.readAt)}
          onClick={handleMarkAll}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {notificationsQuery.isLoading && !items.length && (
        <p className="text-sm text-muted-foreground">Loading notifications…</p>
      )}

      {!notificationsQuery.isLoading && items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {unreadOnly
            ? "No unread notifications."
            : "No notifications yet."}
        </p>
      )}

      <div className="space-y-3">
        {items.map((n) => (
          <Card
            key={n.id}
            className={n.readAt ? undefined : "border-primary/40"}
          >
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={n.readAt ? "secondary" : "default"}>
                    {n.type}
                  </Badge>
                  <span className="text-sm font-medium">{n.title}</span>
                </div>
                {n.message && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {n.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(n.createdAt)}
                </p>
                {n.orderId && (
                  <Link
                    href={`/orders/${n.orderId}`}
                    onClick={() => handleOpen(n)}
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                  >
                    View order →
                  </Link>
                )}
              </div>
              {!n.readAt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpen(n)}
                >
                  Mark read
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}