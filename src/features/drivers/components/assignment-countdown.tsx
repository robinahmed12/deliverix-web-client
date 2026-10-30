"use client";

import * as React from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AssignmentCountdownProps {
  expiresAt: string | null | undefined;
  onExpire?: () => void;
  className?: string;
}

export function AssignmentCountdown({
  expiresAt,
  onExpire,
  className,
}: AssignmentCountdownProps) {
  const [secondsRemaining, setSecondsRemaining] = React.useState<number | null>(() => {
    if (!expiresAt) return null;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const expiredFiredRef = React.useRef(false);

  React.useEffect(() => {
    if (!expiresAt) {
      setSecondsRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      const remaining = Math.max(0, diff);
      setSecondsRemaining(remaining);

      if (remaining === 0 && !expiredFiredRef.current) {
        expiredFiredRef.current = true;
        onExpire?.();
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (secondsRemaining === null) {
    return null;
  }

  const isExpired = secondsRemaining <= 0;
  const isUrgent = secondsRemaining > 0 && secondsRemaining < 60;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (isExpired) {
    return (
      <Badge
        variant="destructive"
        className={cn("flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider", className)}
      >
        <AlertTriangle className="size-3.5" />
        Offer Expired
      </Badge>
    );
  }

  return (
    <Badge
      variant={isUrgent ? "destructive" : "warning"}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium transition-colors",
        isUrgent && "animate-pulse border-destructive bg-destructive/15 text-destructive font-bold",
        !isUrgent && "border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200",
        className,
      )}
    >
      <Clock className={cn("size-3.5", isUrgent ? "text-destructive" : "text-amber-600 dark:text-amber-400")} />
      <span>Expires in {formattedTime}</span>
    </Badge>
  );
}
