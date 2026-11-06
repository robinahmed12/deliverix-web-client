"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  AlertTriangle,
  Camera,
  XCircle,
} from "lucide-react";
import { getOrder, listOrderProofs } from "@/features/orders/api";
import { useCustomerCancelOrderMutation } from "../queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerSupportChatWidget } from "@/features/support-rag/components/customer-support-chat-widget";
import type { DeliveryProof } from "@/features/orders/types";

interface CustomerOrderTrackerProps {
  orderId: string;
}

const STEPS = [
  { key: "Pending", label: "Order Placed" },
  { key: "ReadyForPickup", label: "Ready for Pickup" },
  { key: "Assigned", label: "Driver Assigned" },
  { key: "PickedUp", label: "Picked Up" },
  { key: "InTransit", label: "In Transit" },
  { key: "OutForDelivery", label: "Out for Delivery" },
  { key: "Delivered", label: "Delivered" },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "Pending":
      return 0;
    case "ReadyForPickup":
      return 1;
    case "Assigned":
      return 2;
    case "PickedUp":
      return 3;
    case "InTransit":
      return 4;
    case "OutForDelivery":
      return 5;
    case "Delivered":
      return 6;
    case "Failed":
    case "ReturnInProgress":
    case "Returned":
    case "Cancelled":
      return -1;
    default:
      return 0;
  }
}

export function CustomerOrderTracker({ orderId }: CustomerOrderTrackerProps) {
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("CUSTOMER_REQUESTED");

  const cancelMutation = useCustomerCancelOrderMutation();

  const { data: order, isLoading: isOrderLoading, refetch: refetchOrder } = useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => getOrder(orderId),
    refetchInterval: (query) => {
      // Poll every 10s if in active transit (TRK-001)
      const st = query.state.data?.status;
      return st === "InTransit" || st === "OutForDelivery" ? 10_000 : false;
    },
  });

  const { data: proofsData } = useQuery({
    queryKey: ["orders", orderId, "proofs"],
    queryFn: () => listOrderProofs(orderId),
    enabled: order?.status === "Delivered",
  });

  if (isOrderLoading) {
    return (
      <div className="space-y-6 w-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center w-full">
        <AlertTriangle className="size-12 text-destructive mx-auto mb-3" />
        <h2 className="text-xl font-bold">Order Not Found</h2>
        <p className="text-muted-foreground mt-1">This order does not exist or you do not have permission to view it.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/portal/orders">Back to My Deliveries</Link>
        </Button>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancellable = ["Pending", "ReadyForPickup"].includes(order.status);
  const isFailed = order.status === "Failed";
  const isCancelled = order.status === "Cancelled";
  const isDelivered = order.status === "Delivered";

  const handleConfirmCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        orderId: order.id,
        data: {
          reasonCode: cancelReason,
          reasonText: "Cancelled directly via customer portal self-service",
        },
      });
      setIsCancelOpen(false);
      void refetchOrder();
    } catch {
      // Handled by toast / error boundary
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Back button & Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1 p-0 h-auto">
            <Link href="/portal/orders">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <span className="text-muted-foreground">&bull;</span>
          <h1 className="text-2xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
        </div>

        {isCancellable && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsCancelOpen(true)}
          >
            Cancel Order
          </Button>
        )}
      </div>

      {/* Exception Alerts */}
      {isFailed && (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <CardTitle className="text-base font-semibold">Delivery Attempt Unsuccessful</CardTitle>
            </div>
            <CardDescription className="text-destructive/90">
              The courier was unable to complete the delivery attempt. Our policy supports up to 3 attempts. You can reschedule a new window or contact support for help.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {isCancelled && (
        <Card className="border-muted bg-muted/40">
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="size-5" />
              <CardTitle className="text-base font-semibold">This Order Was Cancelled</CardTitle>
            </div>
            <CardDescription>
              This delivery was cancelled before courier pickup. Any capacity reservation was released.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Visual Milestone Stepper (if not cancelled) */}
      {!isCancelled && !isFailed && (
        <Card className="p-6">
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-base font-medium">Delivery Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative">
              <div className="hidden sm:flex justify-between items-center relative">
                {/* Connecting bar */}
                <div className="absolute top-4 left-0 right-0 h-1 bg-muted -z-0" />
                <div
                  className="absolute top-4 left-0 h-1 bg-primary transition-all duration-500 -z-0"
                  style={{ width: `${(Math.max(0, currentStep) / (STEPS.length - 1)) * 100}%` }}
                />

                {STEPS.map((step, idx) => {
                  const isDone = currentStep >= idx;
                  const isCurrent = currentStep === idx;
                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10">
                      <div
                        className={`size-8 rounded-full flex items-center justify-center font-semibold text-xs transition-colors ${
                          isDone
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground border-2 border-background"
                        } ${isCurrent ? "ring-4 ring-primary/20 animate-pulse" : ""}`}
                      >
                        {isDone ? <CheckCircle2 className="size-4" /> : idx + 1}
                      </div>
                      <span className={`text-[11px] mt-2 font-medium text-center max-w-[80px] ${
                        isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Stepper View */}
              <div className="sm:hidden space-y-3">
                {STEPS.map((step, idx) => {
                  const isDone = currentStep >= idx;
                  const isCurrent = currentStep === idx;
                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div
                        className={`size-6 rounded-full flex items-center justify-center text-xs ${
                          isDone ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="size-3.5" /> : idx + 1}
                      </div>
                      <span className={`text-sm ${isCurrent ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proof of Delivery Viewer (when delivered) */}
      {isDelivered && (
        <Card className="border-emerald-200 dark:border-emerald-950 bg-emerald-50/20">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <Camera className="size-5" />
              <CardTitle className="text-base font-semibold">Proof of Delivery (POD)</CardTitle>
            </div>
            <CardDescription>
              Delivered successfully on{" "}
              {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : "Confirmed"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {proofsData?.data && proofsData.data.length > 0 ? (
              <div className="space-y-2">
                {proofsData.data.map((proof: DeliveryProof) => (
                  <div key={proof.id} className="text-sm">
                    {proof.evidenceValue && (
                      <p>
                        <strong>Recipient / Note:</strong> {proof.evidenceValue}
                      </p>
                    )}
                    {proof.signedUrl && (
                      <div className="mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proof.signedUrl}
                          alt="Delivery Confirmation Proof"
                          className="rounded-lg max-h-64 object-cover border"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Digital confirmation signed and recorded in custody records.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Delivery Destination */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              Delivery Destination
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5 text-muted-foreground">
            <p className="font-semibold text-foreground">
              {order.deliveryAddress?.contactName ?? "Recipient"}
            </p>
            <p>{order.deliveryAddress?.line1}</p>
            {order.deliveryAddress?.line2 && <p>{order.deliveryAddress.line2}</p>}
            <p>
              {order.deliveryAddress?.city}, {order.deliveryAddress?.region} {order.deliveryAddress?.postalCode}
            </p>
            {order.deliveryInstructions && (
              <div className="pt-2 text-xs border-t mt-2">
                <span className="font-medium text-foreground">Instructions:</span> {order.deliveryInstructions}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule & Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Package className="size-4 text-primary" />
              Package & Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="size-4 text-primary" />
                Promise Window:
              </span>
              <span className="font-medium text-foreground">
                {order.promisedAtEnd
                  ? new Date(order.promisedAtEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Standard Window"}
              </span>
            </div>

            <div className="border-t pt-2 space-y-1">
              <span className="text-xs font-semibold uppercase text-muted-foreground block">
                Items ({order.items?.length ?? 1})
              </span>
              {order.items?.map((it) => (
                <div key={it.id} className="flex justify-between text-xs">
                  <span>
                    {it.quantity}x {it.name}
                  </span>
                  <span className="text-muted-foreground">{it.description ?? ""}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-2 flex justify-between text-xs font-semibold">
              <span>Delivery Fee:</span>
              <span>${order.deliveryFee ?? "0.00"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancellation Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" />
              Cancel Order #{order.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? This action is immediate and releases any reserved driver capacity.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <label className="text-sm font-medium">Cancellation Reason</label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="CUSTOMER_REQUESTED">Changed my mind</option>
              <option value="ORDERED_BY_MISTAKE">Ordered by mistake</option>
              <option value="INCORRECT_ADDRESS">Entered wrong address</option>
              <option value="FOUND_ALTERNATIVE">Found alternative item</option>
            </select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCancelOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Keep Order
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating AI Chat Widget with Order Context */}
      <CustomerSupportChatWidget currentOrderId={order.id} />
    </div>
  );
}
