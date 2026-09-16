"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Notification bell — presentational in Phase 1; wired to the notifications
 * query and polling in the Notifications phase (NOTIF-001..004).
 */
export function NotificationBell() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Notifications"
      title="Notifications"
      disabled
    >
      <Bell className="h-5 w-5" />
    </Button>
  );
}