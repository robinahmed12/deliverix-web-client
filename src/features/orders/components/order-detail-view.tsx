"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "../components/order-status-badge";
import { AddressBlock } from "../components/address-block";
import {
  useOrder,
  useOrderHistory,
  useOrderNotes,
  useMarkOrderReadyMutation,
  useCancelOrderMutation,
  useCreateOrderNoteMutation,
  useOrderPermissions,
  useIdempotencyKey,
  ordersKeys,
} from "../queries";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import {
  CANCELLABLE_ORDER_STATUSES,
  EDITABLE_ORDER_STATUSES,
  TERMINAL_ORDER_STATUSES,
} from "../types";
import type { Order, OrderStatusHistoryEntry, OrderNote } from "../types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface OrderDetailViewProps {
  initialOrder: Order;
  initialHistory: OrderStatusHistoryEntry[];
  initialNotes: OrderNote[];
}

export function OrderDetailView({
  initialOrder,
  initialHistory,
  initialNotes,
}: OrderDetailViewProps) {
  const router = useRouter();
  const getKey = useIdempotencyKey();
  const { canEdit, canCancel, canAddNotes } = useOrderPermissions();

  const orderQuery = useOrder(initialOrder.id, initialOrder);
  const historyQuery = useOrderHistory(initialOrder.id, initialHistory);
  const notesQuery = useOrderNotes(initialOrder.id, initialNotes);

  const readyMutation = useMarkOrderReadyMutation(initialOrder.id);
  const cancelMutation = useCancelOrderMutation(initialOrder.id);
  const addNoteMutation = useCreateOrderNoteMutation(initialOrder.id);

  const order = orderQuery.data ?? initialOrder;
  const history = historyQuery.data ?? initialHistory;
  const notes = notesQuery.data ?? initialNotes;

  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelReasonText, setCancelReasonText] = React.useState("");
  const [noteBody, setNoteBody] = React.useState("");

  const isTerminal = TERMINAL_ORDER_STATUSES.has(order.status);
  const isCancellable =
    canCancel && CANCELLABLE_ORDER_STATUSES.has(order.status);
  const isReadyable =
    canEdit && order.status === "Pending";

  async function handleReady() {
    try {
      await readyMutation.mutateAsync();
    } catch {
      // error handled by mutation
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    try {
      await cancelMutation.mutateAsync({
        data: {
          reasonCode: cancelReason.trim(),
          reasonText: cancelReasonText.trim() || undefined,
        },
        version: order.version,
      });
      setCancelOpen(false);
      setCancelReason("");
      setCancelReasonText("");
    } catch {
      // error handled by mutation
    }
  }

  async function handleAddNote() {
    if (!noteBody.trim()) return;
    const key = await getKey({ body: noteBody.trim() });
    try {
      await addNoteMutation.mutateAsync({
        body: noteBody.trim(),
        idempotencyKey: key,
      });
      setNoteBody("");
    } catch {
      // error handled by mutation
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        {isTerminal && (
          <span className="text-sm text-muted-foreground">
            This order has reached a terminal state.
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {isReadyable && (
            <Button
              onClick={handleReady}
              disabled={readyMutation.isPending}
            >
              {readyMutation.isPending ? "Marking..." : "Mark ready"}
            </Button>
          )}
          {isCancellable && (
            <Button
              variant="destructive"
              onClick={() => setCancelOpen(true)}
            >
              Cancel order
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pickup address</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressBlock address={order.pickupAddress} label="" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delivery address</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressBlock address={order.deliveryAddress} label="" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          {order.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items.</p>
          ) : (
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-baseline justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.description && (
                      <span className="ml-2 text-muted-foreground">
                        – {item.description}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Qty: {item.quantity}
                    {item.weight != null && (
                      <> · {item.weight} {item.weightUnit ?? "kg"}</>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Promised window: </span>
            {order.promisedAtStart
              ? `${formatDateTime(order.promisedAtStart)} – ${formatDateTime(order.promisedAtEnd)}`
              : "Not set"}
          </div>
          <div>
            <span className="text-muted-foreground">Delivery fee: </span>
            {order.deliveryFee
              ? formatCurrency(order.deliveryFee, order.currencyCode)
              : "—"}
          </div>
          {order.pickupInstructions && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Pickup instructions: </span>
              {order.pickupInstructions}
            </div>
          )}
          {order.deliveryInstructions && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Delivery instructions: </span>
              {order.deliveryInstructions}
            </div>
          )}
          {order.packageNote && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Package note: </span>
              {order.packageNote}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history.</p>
          ) : (
            <div className="relative space-y-4 pl-4">
              <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border" />
              {[...history].reverse().map((entry, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-2.5 top-1 h-2 w-2 rounded-full bg-primary" />
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">{entry.fromStatus}</span>
                      {" → "}
                      <span className="font-medium">{entry.toStatus}</span>
                    </p>
                    {entry.reasonCode && (
                      <p className="text-xs text-muted-foreground">
                        Reason: {entry.reasonCode}
                        {entry.reasonText ? ` – ${entry.reasonText}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canAddNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Internal notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a note..."
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleAddNote();
                  }
                }}
              />
              <Button
                onClick={() => void handleAddNote()}
                disabled={!noteBody.trim() || addNoteMutation.isPending}
                size="sm"
              >
                Add
              </Button>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {[...notes].reverse().map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <p>{note.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The order will be permanently
              cancelled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason code</label>
              <Input
                placeholder="e.g. CUSTOMER_REQUEST"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Additional details (optional)
              </label>
              <Textarea
                placeholder="Optional details about the cancellation..."
                value={cancelReasonText}
                onChange={(e) => setCancelReasonText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Keep order
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleCancel()}
              disabled={!cancelReason.trim() || cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}