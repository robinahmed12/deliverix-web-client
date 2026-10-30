"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyDriverProfile,
  getMyAssignments,
  setMyAvailability,
  acceptAssignment,
  rejectAssignment,
  confirmOrderPickup,
  startOrderTransit,
  startOrderOutForDelivery,
  type DriverAssignmentItem,
} from "../api-me";
import { toast } from "sonner";
import { AssignmentCountdown } from "./assignment-countdown";
import { RejectOfferDialog } from "./reject-offer-dialog";
import { DeliveryJourneyStepper } from "./delivery-journey-stepper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Package,
  ArrowRight,
  Power,
  RotateCw,
  Navigation,
  Phone,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { formatDate, formatAddress } from "@/lib/utils/formatters";
import { messageFor } from "@/lib/api/errors";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATE_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  Available: { label: "Available", variant: "success" },
  Assigned: { label: "Assigned", variant: "default" },
  OnDelivery: { label: "On Delivery", variant: "warning" },
  Offline: { label: "Offline", variant: "secondary" },
  Unavailable: { label: "Unavailable", variant: "destructive" },
};

export function DriverDashboardView() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = React.useState<string | null>(null);

  // 1. Fetch Driver Profile
  const profileQuery = useQuery({
    queryKey: ["driver", "me"],
    queryFn: getMyDriverProfile,
    staleTime: 15_000,
  });

  // 2. Fetch Driver Assignments
  const assignmentsQuery = useQuery({
    queryKey: ["driver", "me", "assignments"],
    queryFn: () => getMyAssignments(),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });


  // 3. Mutations
  const availabilityMutation = useMutation({
    mutationFn: setMyAvailability,
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["driver", "me"] });
    },
    onError: (err) => {
      setActionError(messageFor(err, "Failed to update availability status."));
    },
  });

  const acceptMutation = useMutation({
    mutationFn: acceptAssignment,
    onSuccess: () => {
      setActionError(null);
      toast.success("Offer accepted!", {
        description: "Customer has been notified of your assignment via email and in-app alert.",
      });
      void queryClient.invalidateQueries({ queryKey: ["driver", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["driver", "me", "assignments"] });
    },
    onError: (err) => {
      setActionError(messageFor(err, "Failed to accept assignment."));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ assignmentId, params }: { assignmentId: string; params?: { reasonCode?: string; reasonText?: string } }) =>
      rejectAssignment(assignmentId, params),
    onSuccess: () => {
      setActionError(null);
      toast.info("Offer declined.", {
        description: "Your availability state has returned to Available.",
      });
      void queryClient.invalidateQueries({ queryKey: ["driver", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["driver", "me", "assignments"] });
    },
    onError: (err) => {
      setActionError(messageFor(err, "Failed to decline assignment."));
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ orderId, next }: { orderId: string; next: "pickup" | "transit" | "out-for-delivery" }) => {
      if (next === "pickup") return confirmOrderPickup(orderId);
      if (next === "transit") return startOrderTransit(orderId);
      if (next === "out-for-delivery") return startOrderOutForDelivery(orderId);
    },
    onSuccess: (_, variables) => {
      setActionError(null);
      if (variables.next === "pickup") {
        toast.success("Package picked up!", {
          description: "Customer notified package is in transit via email & in-app alert.",
        });
      } else if (variables.next === "transit") {
        toast.success("In-transit started!", {
          description: "Customer notified package is en route via email & in-app alert.",
        });
      } else if (variables.next === "out-for-delivery") {
        toast.success("Out for delivery!", {
          description: "Customer proximity alert sent via email & in-app alert.",
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["driver", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["driver", "me", "assignments"] });
    },
    onError: (err) => {
      setActionError(messageFor(err, "Failed to perform delivery action."));
    },
  });

  if (profileQuery.isLoading || assignmentsQuery.isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const driver = profileQuery.data;
  const assignments = assignmentsQuery.data ?? [];

  // Identify active offer or current active delivery
  const offeredAssignment = assignments.find((a) => a.status === "Offered");
  const acceptedAssignment = assignments.find((a) => a.status === "Accepted");

  const currentState = driver?.state ?? "Offline";
  const stateConfig = STATE_BADGES[currentState] ?? { label: currentState, variant: "secondary" };

  // Calculate Proportional Pie Chart Data from Assignments
  const statusCounts = assignments.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const pieColors: Record<string, string> = {
    Completed: "#10b981", // emerald
    Accepted: "#3b82f6",  // blue
    Offered: "#f59e0b",   // amber
    Expired: "#6b7280",   // gray
    Rejected: "#ef4444",  // red
    Withdrawn: "#8b5cf6", // violet
    Released: "#ec4899",  // pink
  };

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
    color: pieColors[status] || "#94a3b8",
  }));

  // Build 7-day Stacked Area Chart Data
 // Build 7-day Stacked Area Chart Data
const stackedAreaData = (() => {
  const days: {
    day: string;
    dateStr: string;
    completed: number;
    accepted: number;
    offered: number;
  }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", {
      weekday: "short",
    });

    days.push({
      day: dayName,
      dateStr,
      completed: 0,
      accepted: 0,
      offered: 0,
    });
  }

  assignments.forEach((a) => {
    const aDate = (a.offeredAt || "").split("T")[0];
    const targetDay = days.find((d) => d.dateStr === aDate);

    if (targetDay) {
      if (a.status === "Completed") targetDay.completed += 1;
      else if (a.status === "Accepted") targetDay.accepted += 1;
      else if (a.status === "Offered") targetDay.offered += 1;
    }
  });

  // Compute cumulative sum for the stacked visualization effect
  let runningCompleted = 0;
  let runningAccepted = 0;
  let runningOffered = 0;

  return days.map((item) => {
    runningCompleted += item.completed;
    runningAccepted += item.accepted;
    runningOffered += item.offered;

    return {
      day: item.day,
      completed: runningCompleted,
      accepted: runningAccepted,
      offered: runningOffered,
    };
  });
})();


  return (
    <div className="space-y-6 p-6">
      {/* Hero Banner */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Driver Control Center</h1>
            <Badge variant={stateConfig.variant} className="text-sm px-2.5 py-0.5">
              {stateConfig.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Driver ID: <span className="font-semibold text-foreground">{driver?.driverCode || "N/A"}</span>
            {driver?.contactPhone && ` • Phone: ${driver.contactPhone}`}
            {driver?.currentVehicle && ` • Vehicle: ${driver.currentVehicle.registrationNumber} (${driver.currentVehicle.vehicleType})`}
          </p>
        </div>

        {/* Quick Availability Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {currentState === "Offline" ? (
            <Button
              onClick={() => availabilityMutation.mutate("Available")}
              disabled={availabilityMutation.isPending || !driver?.active}
              variant="default"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Power className="size-4" />
              Go Available
            </Button>
          ) : (
            <Button
              onClick={() => availabilityMutation.mutate("Offline")}
              disabled={
                availabilityMutation.isPending ||
                currentState === "Assigned" ||
                currentState === "OnDelivery"
              }
              variant="outline"
              className="gap-2"
            >
              <Power className="size-4 text-muted-foreground" />
              Go Offline
            </Button>
          )}

          {currentState === "Available" && (
            <Button
              onClick={() => availabilityMutation.mutate("Unavailable")}
              disabled={availabilityMutation.isPending}
              variant="secondary"
              size="sm"
            >
              Pause (Break)
            </Button>
          )}

          {currentState === "Unavailable" && (
            <Button
              onClick={() => availabilityMutation.mutate("Available")}
              disabled={availabilityMutation.isPending}
              variant="outline"
              size="sm"
            >
              Resume Availability
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Action Error</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Primary Action Card: Pending Assignment Offer */}
      {offeredAssignment && (
        <Card className="border-amber-400 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                <CardTitle className="text-lg text-amber-900 dark:text-amber-200">
                  New Assignment Offer Available!
                </CardTitle>
              </div>
              <AssignmentCountdown
                expiresAt={offeredAssignment.offerExpiresAt}
                onExpire={() => {
                  void queryClient.invalidateQueries({ queryKey: ["driver", "me"] });
                  void queryClient.invalidateQueries({ queryKey: ["driver", "me", "assignments"] });
                }}
              />
            </div>
            <CardDescription>
              Order <span className="font-semibold">{offeredAssignment.order.orderNumber}</span> has been dispatched to you.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-background p-3 border">
                <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <MapPin className="size-3.5 text-blue-500" /> Pickup Location
                </span>
                <p className="mt-1 font-medium">{formatAddress(offeredAssignment.order.pickupAddress)}</p>
              </div>
              <div className="rounded-lg bg-background p-3 border">
                <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <MapPin className="size-3.5 text-emerald-500" /> Delivery Destination
                </span>
                <p className="mt-1 font-medium">{formatAddress(offeredAssignment.order.deliveryAddress)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={() => acceptMutation.mutate(offeredAssignment.id)}
                disabled={acceptMutation.isPending || rejectMutation.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-5"
              >
                <CheckCircle2 className="size-4" />
                Accept Delivery
              </Button>
              <RejectOfferDialog
                assignmentId={offeredAssignment.id}
                orderNumber={offeredAssignment.order.orderNumber}
                isPending={rejectMutation.isPending}
                onReject={(data) =>
                  rejectMutation.mutate({
                    assignmentId: offeredAssignment.id,
                    params: data,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active In-Progress Delivery */}
      {acceptedAssignment && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="size-5 text-primary" />
                <CardTitle className="text-lg">Active Order in Progress</CardTitle>
              </div>
              <Badge variant="default">{acceptedAssignment.order.status}</Badge>
            </div>
            <CardDescription>
              Order <span className="font-semibold">{acceptedAssignment.order.orderNumber}</span> is assigned to you.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <DeliveryJourneyStepper status={acceptedAssignment.order.status} className="my-1" />

            {acceptedAssignment.order.customerPhone && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-medium text-xs text-muted-foreground uppercase">Customer Contact</p>
                    <p className="font-semibold text-foreground">
                      {acceptedAssignment.order.customerName ? `${acceptedAssignment.order.customerName} • ` : ""}
                      {acceptedAssignment.order.customerPhone}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="min-h-[44px] gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
                  <a href={`tel:${acceptedAssignment.order.customerPhone}`}>
                    <Phone className="size-3.5" />
                    Call Customer
                  </a>
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-background p-3 border flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <MapPin className="size-3.5 text-blue-500" /> Pickup Location
                  </span>
                  <p className="mt-1 font-medium">{formatAddress(acceptedAssignment.order.pickupAddress)}</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="mt-2 text-xs text-blue-600 hover:text-blue-700 h-8 px-2 w-fit gap-1">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatAddress(acceptedAssignment.order.pickupAddress))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="size-3" />
                    Navigate to Pickup
                    <ExternalLink className="size-3 ml-0.5" />
                  </a>
                </Button>
              </div>
              <div className="rounded-lg bg-background p-3 border flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <MapPin className="size-3.5 text-emerald-500" /> Delivery Destination
                  </span>
                  <p className="mt-1 font-medium">{formatAddress(acceptedAssignment.order.deliveryAddress)}</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 h-8 px-2 w-fit gap-1">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatAddress(acceptedAssignment.order.deliveryAddress))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="size-3" />
                    Navigate to Destination
                    <ExternalLink className="size-3 ml-0.5" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Workflow Transition Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {acceptedAssignment.order.status === "Assigned" && (
                <Button
                  onClick={() =>
                    transitionMutation.mutate({
                      orderId: acceptedAssignment.order.id,
                      next: "pickup",
                    })
                  }
                  disabled={transitionMutation.isPending}
                  className="gap-2 min-h-[44px] px-6 text-sm font-semibold"
                >
                  {transitionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
                  Confirm Package Pickup
                </Button>
              )}

              {acceptedAssignment.order.status === "PickedUp" && (
                <Button
                  onClick={() =>
                    transitionMutation.mutate({
                      orderId: acceptedAssignment.order.id,
                      next: "transit",
                    })
                  }
                  disabled={transitionMutation.isPending}
                  className="gap-2 min-h-[44px] px-6 text-sm font-semibold"
                >
                  {transitionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
                  Start In-Transit
                </Button>
              )}

              {acceptedAssignment.order.status === "InTransit" && (
                <Button
                  onClick={() =>
                    transitionMutation.mutate({
                      orderId: acceptedAssignment.order.id,
                      next: "out-for-delivery",
                    })
                  }
                  disabled={transitionMutation.isPending}
                  className="gap-2 min-h-[44px] px-6 text-sm font-semibold"
                >
                  {transitionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
                  Mark Out for Delivery
                </Button>
              )}

              <Button asChild variant="outline" className="min-h-[44px]">
                <Link href={`/orders/${acceptedAssignment.order.id}`}>
                  View Order Details & POD
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duty Status</CardTitle>
            <Power className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentState}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {driver?.active ? "Account in active standing" : "Account inactive"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Vehicle</CardTitle>
            <Truck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {driver?.currentVehicle?.registrationNumber ?? "No Vehicle"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {driver?.currentVehicle
                ? `${driver.currentVehicle.vehicleType} • ${driver.currentVehicle.status}`
                : "Contact dispatch to allocate vehicle"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignments.filter((a) => ["Offered", "Accepted"].includes(a.status)).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {offeredAssignment ? "1 pending offer awaiting response" : "Queue is clear"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics: Proportional Status Distribution Pie & Cumulative Stacked Area Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proportional Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Delivery Status Distribution</CardTitle>
                <CardDescription>Proportional breakdown of your assigned tasks</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {assignments.length} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-sm text-muted-foreground">
                <Package className="mb-2 size-8 text-muted-foreground/50" />
                No assignments recorded to display distribution.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={3}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => {
                        const num = typeof val === "number" ? val : 0;
                        return [
                          `${num} tasks (${((num / (assignments.length || 1)) * 100).toFixed(1)}%)`,
                          String(name ?? ""),
                        ];
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stacked Area Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Activity Timeline (Stacked Area)</CardTitle>
                <CardDescription>Cumulative delivery volume and state progression</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                Last 7 Days
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stackedAreaData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorOffered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                  <XAxis dataKey="day" className="text-xs text-muted-foreground" tickLine={false} />
                  <YAxis className="text-xs text-muted-foreground" allowDecimals={false} tickLine={false} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stackId="1"
                    stroke="#10b981"
                    fill="url(#colorCompleted)"
                  />
                  <Area
                    type="monotone"
                    dataKey="accepted"
                    name="Accepted"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="url(#colorAccepted)"
                  />
                  <Area
                    type="monotone"
                    dataKey="offered"
                    name="Offered"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="url(#colorOffered)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments History */}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Assignments</CardTitle>
            <CardDescription>Recent deliveries dispatched to your profile</CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void assignmentsQuery.refetch()}
            className="gap-1 text-xs"
          >
            <RotateCw className="size-3.5" />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {assignments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No assignments assigned to you yet. Set your status to <strong>Available</strong> to receive delivery offers.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pickup Address</TableHead>
                  <TableHead>Delivery Address</TableHead>
                  <TableHead>Offered At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">
                      <Link
                        href={`/orders/${item.order.id}`}
                        className="text-primary hover:underline"
                      >
                        {item.order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "Accepted"
                            ? "success"
                            : item.status === "Offered"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {formatAddress(item.order.pickupAddress)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {formatAddress(item.order.deliveryAddress)}
                    </TableCell>
                    <TableCell>{formatDate(item.offeredAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/orders/${item.order.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
