"use client";

import * as React from "react";
import Link from "next/link";
import {
  useVehicle,
  useVehiclePermissions,
  useDeallocateVehicleMutation,
  useIdempotencyKey,
} from "../queries";
import type { VehicleDetail, VehicleOperationalStatus } from "../types";
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
import { formatDateTime } from "@/lib/utils/formatters";
import { UserRound, ArrowLeft } from "lucide-react";
import { EditVehicleDialog } from "./edit-vehicle-dialog";
import { AllocateVehicleDialog } from "./allocate-vehicle-dialog";

const STATUS_VARIANTS: Record<
  VehicleOperationalStatus,
  "success" | "warning" | "default" | "secondary" | "destructive"
> = {
  Active: "success",
  Maintenance: "warning",
  Inactive: "secondary",
};

interface VehicleDetailViewProps {
  vehicleId: string;
  initialData: VehicleDetail;
}

export function VehicleDetailView({
  vehicleId,
  initialData,
}: VehicleDetailViewProps) {
  const permissions = useVehiclePermissions();
  const getKey = useIdempotencyKey("vehicle-deallocate");
  const [editOpen, setEditOpen] = React.useState(false);
  const [allocateOpen, setAllocateOpen] = React.useState(false);
  const [confirmingRelease, setConfirmingRelease] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const detailQuery = useVehicle(vehicleId, initialData);
  const deallocateMutation = useDeallocateVehicleMutation();

  const vehicle = detailQuery.data;

  async function handleRelease() {
    if (!vehicle || !vehicle.currentDriver) return;
    setActionError(null);
    try {
      const key = await getKey({ vehicleId: vehicle.id });
      await deallocateMutation.mutateAsync({
        id: vehicle.id,
        idempotencyKey: key,
      });
      setConfirmingRelease(false);
    } catch (error) {
      setActionError(messageFor(error, "Failed to release the vehicle."));
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

  if (!vehicle) {
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
          href="/vehicles"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to vehicles
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {vehicle.registrationNumber}
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANTS[vehicle.status]}>
              {vehicle.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Version {vehicle.version}
            </span>
          </div>
        </div>
        {permissions.canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
              Edit details
            </Button>
            <Button type="button" onClick={() => setAllocateOpen(true)}>
              {vehicle.currentDriver ? "Reassign driver" : "Allocate driver"}
            </Button>
            {vehicle.currentDriver && (
              <Button
                type="button"
                variant="outline"
                disabled={deallocateMutation.isPending || confirmingRelease}
                onClick={() => {
                  if (confirmingRelease) {
                    void handleRelease();
                  } else {
                    setConfirmingRelease(true);
                  }
                }}
              >
                {deallocateMutation.isPending
                  ? "Releasing…"
                  : confirmingRelease
                    ? "Confirm release"
                    : "Release"}
              </Button>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Registration number
              </p>
              <p className="mt-1">{vehicle.registrationNumber}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Vehicle type
              </p>
              <p className="mt-1">{vehicle.vehicleType}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Make</p>
              <p className="mt-1">
                {vehicle.make ?? <span className="text-muted-foreground">—</span>}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Model</p>
              <p className="mt-1">
                {vehicle.model ?? <span className="text-muted-foreground">—</span>}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Capacity
              </p>
              <p className="mt-1">
                {vehicle.capacityValue} {vehicle.capacityUnit}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Qualification
              </p>
              <p className="mt-1">
                {vehicle.qualification ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Created</p>
              <p className="mt-1">{formatDateTime(vehicle.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current driver</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle.currentDriver ? (
              <div className="flex items-center gap-2 text-sm">
                <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                <Link
                  href={`/drivers/${vehicle.currentDriver.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {vehicle.currentDriver.driverCode}
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No driver is currently allocated to this vehicle.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <EditVehicleDialog
        vehicle={vehicle}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <AllocateVehicleDialog
        vehicle={vehicle}
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
      />
    </div>
  );
}