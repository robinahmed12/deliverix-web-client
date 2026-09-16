"use client";

import { Package, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/formatters";
import type { DispatchQueueOrder } from "../types";

interface OrderQueueItemProps {
  order: DispatchQueueOrder;
  isSelected: boolean;
  onSelect: (orderId: string) => void;
}

function addressLine(address: Record<string, unknown>): string {
  const line1 = typeof address.line1 === "string" ? address.line1 : "";
  const city = typeof address.city === "string" ? address.city : "";
  return [line1, city].filter(Boolean).join(", ");
}

export function OrderQueueItem({
  order,
  isSelected,
  onSelect,
}: OrderQueueItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(order.id)}
      aria-pressed={isSelected}
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Package className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {order.orderNumber}
        </span>
        {order.zoneName && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            {order.zoneName}
          </span>
        )}
      </div>
      <p className="truncate text-xs text-muted-foreground">
        Pickup: {addressLine(order.pickupAddress)}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        Deliver to: {addressLine(order.deliveryAddress)}
      </p>
      {order.readyAt && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" aria-hidden="true" />
          Ready {formatDateTime(order.readyAt)}
        </span>
      )}
    </button>
  );
}