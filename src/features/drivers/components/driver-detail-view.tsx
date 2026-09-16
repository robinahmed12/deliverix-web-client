"use client";

import * as React from "react";
import Link from "next/link";
import {
  useDriver,
  useDriverPermissions,
  useUpdateDriverMutation,
} from "../queries";
import type {
  DriverAvailabilityState,
  DriverDetail,
} from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { messageFor } from "@/lib/api/errors";
import { formatDate, formatDateTime } from "@/lib/utils/formatters";
import { Truck, ArrowLeft } from "lucide-react";
import { EditDriverDialog } from "./edit-driver-dialog";

const STATE_VARIANTS: Record<DriverAvailabilityState, "success" | "warning" | "default" | "secondary" | "destructive"> = {
  Available: "success",
  Assigned: "default",
  OnDelivery: "warning",
  Offline: "secondary",
  Unavailable: "destructive",
};

interface DriverDetailViewProps {
  driverId: string;
  initialData: DriverDetail;
}

export function DriverDetailView({
  driverId,
  initialData,
}: DriverDetailViewProps) {
  const permissions = useDriverPermissions();
  const [editOpen, setEditOpen] = React.useState(false);
  const [toggleError, setToggleError] = React.useState<string | null>(null);

  const detailQuery = useDriver(driverId, initialData);
  const toggleMutation = useUpdateDriverMutation(driverId);

  const driver = detailQuery.data;

  async function handleToggle() {
    if (!driver) return;
    setToggleError(null);
    try {
      await toggleMutation.mutateAsync({
        data: { active: !driver.active },
        version: driver.version,
      });
    } catch (error) {
      setToggleError(messageFor(error, "Failed to update driver status."));
    }
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  if (!driver) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/drivers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to drivers
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {driver.driverCode}
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant={STATE_VARIANTS[driver.state]}>
              {driver.state}
            </Badge>
            {driver.active ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Version {driver.version}
            </span>
          </div>
        </div>
        {permissions.canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(true)}
            >
              Edit details
            </Button>
            <Button
              type="button"
              variant={driver.active ? "outline" : "default"}
              disabled={toggleMutation.isPending}
              onClick={() => void handleToggle()}
            >
              {toggleMutation.isPending
                ? "Saving…"
                : driver.active
                  ? "Deactivate"
                  : "Activate"}
            </Button>
          </div>
        )}
      </div>

      {toggleError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{toggleError}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Driver details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Contact phone
              </p>
              <p className="mt-1">{driver.contactPhone}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                License number
              </p>
              <p className="mt-1">
                {driver.licenseNumber ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                License expiry
              </p>
              <p className="mt-1">
                {driver.licenseExpiry ? (
                  formatDate(driver.licenseExpiry)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Qualification
              </p>
              <p className="mt-1">
                {driver.qualification ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Created
              </p>
              <p className="mt-1">{formatDateTime(driver.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            {driver.currentVehicle ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">
                    {driver.currentVehicle.registrationNumber}
                  </span>
                  <Badge variant="outline">
                    {driver.currentVehicle.vehicleType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Status: {driver.currentVehicle.status}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No vehicle is currently allocated to this driver.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <EditDriverDialog
        driver={driver}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}