"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Package, Clock, MapPin, Search, ArrowRight, XCircle } from "lucide-react";
import { listOrders } from "@/features/orders/api";
import { useCustomerCancelOrderMutation } from "../queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { Order } from "@/features/orders/types";

function getStatusBadge(status: string) {
  switch (status) {
    case "Delivered":
      return <Badge className="bg-emerald-600 text-white">Delivered</Badge>;
    case "OutForDelivery":
      return <Badge className="bg-amber-600 text-white animate-pulse">Out for Delivery</Badge>;
    case "InTransit":
      return <Badge className="bg-blue-600 text-white">In Transit</Badge>;
    case "PickedUp":
      return <Badge className="bg-sky-600 text-white">Picked Up</Badge>;
    case "Assigned":
      return <Badge className="bg-indigo-600 text-white">Driver Assigned</Badge>;
    case "ReadyForPickup":
      return <Badge className="bg-purple-600 text-white">Ready for Pickup</Badge>;
    case "Pending":
      return <Badge variant="secondary">Processing</Badge>;
    case "Failed":
      return <Badge variant="destructive">Attempt Failed</Badge>;
    case "Cancelled":
      return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function CustomerOrdersView() {
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");
  const [cancelModalOrder, setCancelModalOrder] = React.useState<Order | null>(null);
  const [cancelReason, setCancelReason] = React.useState<string>("CUSTOMER_REQUESTED");

  const cancelMutation = useCustomerCancelOrderMutation();

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ["orders", "customer-list", search],
    queryFn: () => listOrders({ search: search ? search : undefined, pageSize: 50 }),
  });

  const filteredOrders = React.useMemo(() => {
    const list: Order[] = ordersData?.data ?? [];
    return list.filter((order) => {
      if (activeTab === "active") {
        return ["Pending", "ReadyForPickup", "Assigned", "PickedUp", "InTransit", "OutForDelivery"].includes(
          order.status,
        );
      }
      if (activeTab === "completed") {
        return order.status === "Delivered";
      }
      if (activeTab === "cancelled") {
        return order.status === "Cancelled" || order.status === "Returned";
      }
      return true;
    });
  }, [ordersData?.data, activeTab]);

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    try {
      await cancelMutation.mutateAsync({
        orderId: cancelModalOrder.id,
        data: {
          reasonCode: cancelReason,
          reasonText: "Cancelled directly via customer portal self-service",
        },
      });
      setCancelModalOrder(null);
      void refetch();
    } catch {
      // Error handled by query error boundary / toast
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Deliveries</h1>
          <p className="text-muted-foreground mt-1">
            Track packages, check milestone progress, and download Proof of Delivery receipts.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg w-full sm:w-auto">
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "completed", label: "Delivered" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search order #..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="font-semibold text-lg">No orders found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? `No orders matched search term "${search}".` : "You have no orders in this category."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isCancellable = ["Pending", "ReadyForPickup"].includes(order.status);
            return (
              <Card key={order.id} className="hover:border-primary/40 transition-colors">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-semibold">
                        Order #{order.orderNumber}
                      </CardTitle>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground pt-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="size-4 shrink-0 mt-0.5 text-primary" />
                      <span>
                        {order.deliveryAddress
                          ? `${order.deliveryAddress.line1}, ${order.deliveryAddress.city}`
                          : "Delivery destination"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="size-4 shrink-0 text-primary" />
                      <span>
                        {order.promisedAtEnd
                          ? `Estimated by ${new Date(order.promisedAtEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "Scheduled standard"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      {order.items?.length ?? 1} item(s) &bull; Fee: ${order.deliveryFee ?? "0.00"}
                    </span>
                    <div className="flex items-center gap-2">
                      {isCancellable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setCancelModalOrder(order)}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button asChild size="sm" variant="default" className="gap-1.5">
                        <Link href={`/portal/orders/${order.id}`}>
                          Track Details
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancellation Dialog */}
      <Dialog open={!!cancelModalOrder} onOpenChange={(open) => !open && setCancelModalOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" />
              Cancel Order #{cancelModalOrder?.orderNumber}
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
              onClick={() => setCancelModalOrder(null)}
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

      {/* Floating AI Chat Widget */}
      <CustomerSupportChatWidget />
    </div>
  );
}
