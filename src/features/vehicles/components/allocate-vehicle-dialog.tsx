"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { allocateVehicleSchema, type AllocateVehicleInput } from "../schemas";
import { useAllocateVehicleMutation, useDriverSearch, useIdempotencyKey } from "../queries";
import type { VehicleDetail } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { messageFor } from "@/lib/api/errors";
import { Search, X } from "lucide-react";

interface AllocateVehicleDialogProps {
  vehicle: VehicleDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllocateVehicleDialog({
  vehicle,
  open,
  onOpenChange,
}: AllocateVehicleDialogProps) {
  const getKey = useIdempotencyKey("vehicle-allocate");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [driverSearch, setDriverSearch] = React.useState("");

  const allocateMutation = useAllocateVehicleMutation();
  const driversQuery = useDriverSearch(driverSearch);

  const form = useForm<AllocateVehicleInput>({
    resolver: zodResolver(allocateVehicleSchema),
    defaultValues: { driverId: "", reasonCode: "" },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset();
      setServerError(null);
      setDriverSearch("");
    }
    onOpenChange(nextOpen);
  }

  const driverId = form.watch("driverId");
  const matchedDriver =
    (driversQuery.data ?? []).find((d) => d.id === driverId) ?? null;

  const drivers = React.useMemo(
    () => (driversQuery.data ?? []).filter((d) => d.id !== driverId),
    [driversQuery.data, driverId],
  );

  async function onSubmit(values: AllocateVehicleInput) {
    setServerError(null);
    const payload: AllocateVehicleInput = {
      driverId: values.driverId,
      reasonCode: values.reasonCode?.trim() || null,
    };
    const key = await getKey(payload);
    try {
      await allocateMutation.mutateAsync({
        id: vehicle.id,
        data: payload,
        idempotencyKey: key,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to allocate vehicle."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocate {vehicle.registrationNumber}</DialogTitle>
          <DialogDescription>
            Assign this vehicle to a driver. Any existing allocation for the
            driver or vehicle is released first.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Driver</Label>
            {matchedDriver ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{matchedDriver.driverCode}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {matchedDriver.contactPhone}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    form.setValue("driverId", "", { shouldValidate: true });
                    setDriverSearch("");
                  }}
                >
                  <X className="size-4" aria-hidden="true" />
                  <span className="sr-only">Remove</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    aria-label="Search drivers"
                    placeholder="Search drivers by code or phone…"
                    className="pl-8"
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                  />
                </div>
                {driverSearch && driversQuery.isLoading && (
                  <p className="text-sm text-muted-foreground">Searching…</p>
                )}
                {driverSearch &&
                  !driversQuery.isLoading &&
                  driversQuery.isSuccess &&
                  drivers.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No drivers found.
                    </p>
                  )}
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border">
                  {drivers.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50"
                        onClick={() =>
                          form.setValue("driverId", d.id, { shouldValidate: true })
                        }
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {d.driverCode}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {d.contactPhone}
                          </span>
                        </span>
                        {d.active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {form.formState.errors.driverId && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.driverId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reasonCode">Reason (optional)</Label>
            <Input
              id="reasonCode"
              placeholder="e.g. daily allocation"
              {...form.register("reasonCode")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={allocateMutation.isPending}>
              {allocateMutation.isPending ? "Allocating…" : "Allocate vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}