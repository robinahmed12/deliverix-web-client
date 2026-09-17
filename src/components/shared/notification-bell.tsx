"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnreadCount } from "@/features/notifications/queries";

export function NotificationBell() {
  const unreadQuery = useUnreadCount();
  const unread = unreadQuery.data ?? 0;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label="Notifications"
    >
      <Link href="/notifications" className="relative">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}