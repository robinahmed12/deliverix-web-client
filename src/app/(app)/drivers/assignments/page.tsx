"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyAssignments,
  getMyDriverProfile,
  acceptAssignment,
  rejectAssignment,
  confirmOrderPickup,
  startOrderTransit,
  startOrderOutForDelivery,
  setMyAvailability,
  type DriverAssignmentItem,
} from "@/features/drivers/api-me";
import { toast } from "sonner";
import { AssignmentCountdown } from "@/features/drivers/components/assignment-countdown";
import { RejectOfferDialog } from "@/features/drivers/components/reject-offer-dialog";
import { DeliveryJourneyStepper } from "@/features/drivers/components/delivery-journey-stepper";
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
import { formatDate, formatAddress } from "@/lib/utils/formatters";
import { messageFor } from "@/lib/api/errors";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Package,
  MapPin,
  ArrowRight,
  RotateCw,
  Power,
  Navigation,
  Check,
  X,
  User,
  Phone,
  FileCheck,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function AssignmentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<"open" | "all" | "Completed">("all");
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Fetch Driver Profile
  const profileQuery = useQuery({
    queryKey: ["driver", "me"],
    queryFn: getMyDriverProfile,
    staleTime: 30_000,
  });

  // Fetch Driver Assignments
  const assignmentsQuery = useQuery({
    queryKey: ["driver", "me", "assignments", filter],
    queryFn: () => getMyAssignments(filter),
    staleTime: 10_000,
    refetchInterval: 12_000,
  });

  // Mutations
  const availabilityMutation = useMutation({
    mutationFn: setMyAvailability,
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["driver", "me"] });
    },
    onError: (err) => setActionError(messageFor(err, "Failed to update availability")),
  });

  const acceptMutation = useMutation({
    mutationFn: acceptAssignment,
    onSuccess: () => {
      setActionError(null);
      toast.success("Offer accepted!", {
        description: "Customer has been notified of your assignment via email and in-app alert.",
      });
      void queryClient.invalidateQueries({ queryKey: ["driver", "me", "assignments"] });
      void queryClient.invalidateQueries({ queryKey: ["driver", "me"] });
    },
    onError: (err) => setActionError(messageFor(err, "Failed to accept assignment")),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ assignmentId, params }: { assignmentId: string; params?: { reasonCode?: string; reasonText?: string } }) =>
      rejectAssignment(assignmentId, params),
    onSuccess: () => {
      setActionError(null);
      toast.info("Offer declined.", {
        description: "Your availability state has returned to Available.",
      });
      void queryClient.invalidateQueries({ queryKey: ["driver", "me", "assignments"] });
      void queryClient.invalidateQueries({ queryKey: ["driver", "me"] });
    },
    onError: (err) => setActionError(messageFor(err, "Failed to decline assignment")),
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ orderId, step }: { orderId: string; step: "pickup" | "transit" | "out" }) => {
      if (step === "pickup") return confirmOrderPickup(orderId);
      if (step === "transit") return startOrderTransit(orderId);
      if (step === "out") return startOrderOutForDelivery(orderId);
    },
    onSuccess: (_, variables) => {
      setActionError(null);
      if (variables.step === "pickup") {
        toast.success("Package picked up!", {
          description: "Customer notified package is in transit via email & in-app alert.",
        });
      } else if (variables.step === "transit") {
        toast.success("In-transit started!", {
          description: "Customer notified package is en route via email & in-app alert.",
        });
      } else if (variables.step === "out") {
        toast.success("Out for delivery!", {
          description: "Customer proximity alert sent via email & in-app alert.",
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["driver", "me", "assignments"] });
      void queryClient.invalidateQueries({ queryKey: ["driver", "me"] });
    },
    onError: (err) => setActionError(messageFor(err, "Failed to perform delivery action")),
  });

  const isLoading = profileQuery.isLoading || assignmentsQuery.isLoading;
  const isError = profileQuery.isError;
  const driver = profileQuery.data;
  const assignments = assignmentsQuery.data ?? [];

  // Active or pending work
  const pendingOffer = assignments.find((a) => a.status === "Offered");
  const activeAssignment = assignments.find((a) => a.status === "Accepted");

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError && !driver) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="mx-auto size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Driver Profile Not Found</h2>
        <p className="text-muted-foreground max-w-md mx-auto text-sm">
          Your current account is not linked to a driver profile record in the database.
          To use the driver portal, log in with an account that has a linked driver profile (such as a registered driver), or create a driver record for this account in the Drivers directory.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={() => router.push("/drivers")} variant="default">
            Go to Drivers Management
          </Button>
          <Button onClick={() => router.push("/dashboard")} variant="outline">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6 p-6">
      {/* Top Hero Banner */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Driver Assignments</h1>
            <Badge
              variant={
                driver?.state === "Available"
                  ? "success"
                  : driver?.state === "Assigned"
                    ? "default"
                    : driver?.state === "OnDelivery"
                      ? "warning"
                      : "secondary"
              }
              className="px-2.5 py-0.5 text-sm"
            >
              {driver?.state ?? "Offline"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {driver?.driverCode ? `Driver Code: ${driver.driverCode}` : ""}
            {driver?.contactPhone && ` • ${driver.contactPhone}`}
            {driver?.currentVehicle && ` • Vehicle: ${driver.currentVehicle.registrationNumber}`}
          </p>
        </div>

        {/* Availability Toggle Quick Action */}
        <div className="flex items-center gap-2">
          {driver?.state === "Offline" ? (
            <Button
              onClick={() => availabilityMutation.mutate("Available")}
              disabled={availabilityMutation.isPending || !driver?.active}
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
                driver?.state === "Assigned" ||
                driver?.state === "OnDelivery"
              }
              variant="outline"
              className="gap-2"
            >
              <Power className="size-4 text-muted-foreground" />
              Go Offline
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => void assignmentsQuery.refetch()}
            title="Refresh assignments"
          >
            <RotateCw className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Action Error</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Real-Time Incoming Assignment Offer */}
      {pendingOffer && (
        <Card className="border-amber-400 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                <CardTitle className="text-lg text-amber-900 dark:text-amber-200">
                  New Assignment Offer
                </CardTitle>
              </div>
              <AssignmentCountdown
                expiresAt={pendingOffer.offerExpiresAt}
                onExpire={() => {
                  void queryClient.invalidateQueries({ queryKey: ["driver", "me", "assignments"] });
                  void queryClient.invalidateQueries({ queryKey: ["driver", "me"] });
                }}
              />
            </div>
            <CardDescription>
              Order <span className="font-semibold text-foreground">{pendingOffer.order.orderNumber}</span> has been offered to you.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-background p-3 border">
                <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <MapPin className="size-3.5 text-blue-500" /> Pickup
                </span>
                <p className="mt-1 font-medium">{formatAddress(pendingOffer.order.pickupAddress)}</p>
              </div>
              <div className="rounded-lg bg-background p-3 border">
                <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <MapPin className="size-3.5 text-emerald-500" /> Destination
                </span>
                <p className="mt-1 font-medium">{formatAddress(pendingOffer.order.deliveryAddress)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                onClick={() => acceptMutation.mutate(pendingOffer.id)}
                disabled={acceptMutation.isPending || rejectMutation.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-5"
              >
                <Check className="size-4" />
                Accept Delivery
              </Button>
              <RejectOfferDialog
                assignmentId={pendingOffer.id}
                orderNumber={pendingOffer.order.orderNumber}
                isPending={rejectMutation.isPending}
                onReject={(data) =>
                  rejectMutation.mutate({
                    assignmentId: pendingOffer.id,
                    params: data,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active In-Progress Delivery */}
      {activeAssignment && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="size-5 text-primary" />
                <CardTitle className="text-lg">Active Delivery Responsibility</CardTitle>
              </div>
              <Badge variant="default">{activeAssignment.order.status}</Badge>
            </div>
            <CardDescription>
              Order <span className="font-semibold text-foreground">{activeAssignment.order.orderNumber}</span>
              {activeAssignment.order.customerName && ` • Customer: ${activeAssignment.order.customerName}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <DeliveryJourneyStepper status={activeAssignment.order.status} className="my-1" />

            {activeAssignment.order.customerPhone && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-medium text-xs text-muted-foreground uppercase">Customer Contact</p>
                    <p className="font-semibold text-foreground">
                      {activeAssignment.order.customerName ? `${activeAssignment.order.customerName} • ` : ""}
                      {activeAssignment.order.customerPhone}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="min-h-[44px] gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
                  <a href={`tel:${activeAssignment.order.customerPhone}`}>
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
                  <p className="mt-1 font-medium">{formatAddress(activeAssignment.order.pickupAddress)}</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="mt-2 text-xs text-blue-600 hover:text-blue-700 h-8 px-2 w-fit gap-1">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatAddress(activeAssignment.order.pickupAddress))}`}
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
                    <MapPin className="size-3.5 text-emerald-500" /> Delivery Address
                  </span>
                  <p className="mt-1 font-medium">{formatAddress(activeAssignment.order.deliveryAddress)}</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 h-8 px-2 w-fit gap-1">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatAddress(activeAssignment.order.deliveryAddress))}`}
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

            {/* Step-by-Step Delivery Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {activeAssignment.order.status === "Assigned" && (
                <Button
                  onClick={() =>
                    transitionMutation.mutate({
                      orderId: activeAssignment.order.id,
                      step: "pickup",
                    })
                  }
                  disabled={transitionMutation.isPending}
                  className="gap-2 bg-primary text-primary-foreground min-h-[44px] px-6 text-sm font-semibold"
                >
                  {transitionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
                  1. Confirm Package Pickup
                </Button>
              )}

              {activeAssignment.order.status === "PickedUp" && (
                <Button
                  onClick={() =>
                    transitionMutation.mutate({
                      orderId: activeAssignment.order.id,
                      step: "transit",
                    })
                  }
                  disabled={transitionMutation.isPending}
                  className="gap-2 bg-primary text-primary-foreground min-h-[44px] px-6 text-sm font-semibold"
                >
                  {transitionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
                  2. Start In-Transit
                </Button>
              )}

              {activeAssignment.order.status === "InTransit" && (
                <Button
                  onClick={() =>
                    transitionMutation.mutate({
                      orderId: activeAssignment.order.id,
                      step: "out",
                    })
                  }
                  disabled={transitionMutation.isPending}
                  className="gap-2 bg-primary text-primary-foreground min-h-[44px] px-6 text-sm font-semibold"
                >
                  {transitionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
                  3. Mark Out for Delivery
                </Button>
              )}

              <Button asChild variant="outline" className="gap-2 min-h-[44px]">
                <Link href={`/orders/${activeAssignment.order.id}`}>
                  <FileCheck className="size-4 text-emerald-600" />
                  Complete Delivery & Submit POD
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs & History Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Assignment History & Manifest</CardTitle>
            <CardDescription>All assigned deliveries dispatched to you</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === "open" ? "default" : "outline"}
              onClick={() => setFilter("open")}
            >
              Active / Open
            </Button>
            <Button
              size="sm"
              variant={filter === "Completed" ? "default" : "outline"}
              onClick={() => setFilter("Completed")}
            >
              Completed
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {assignments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <Package className="mx-auto size-10 stroke-1 text-muted-foreground/60" />
              <p className="text-base font-medium">No assignments found</p>
              <p className="text-sm max-w-sm mx-auto">
                {driver?.state === "Offline"
                  ? "You are currently Offline. Turn on your availability to receive new assignment offers from dispatch."
                  : "Dispatch has not assigned any packages to you yet."}
              </p>
              {driver?.state === "Offline" && (
                <Button
                  onClick={() => availabilityMutation.mutate("Available")}
                  disabled={availabilityMutation.isPending || !driver?.active}
                  className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Go Available Now
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Assignment Status</TableHead>
                  <TableHead>Pickup Location</TableHead>
                  <TableHead>Delivery Destination</TableHead>
                  <TableHead>Offered At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {assignments.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
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
                              : item.status === "Completed"
                                ? "default"
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
                        <Link href={`/orders/${item.order.id}`}>View Details</Link>
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
