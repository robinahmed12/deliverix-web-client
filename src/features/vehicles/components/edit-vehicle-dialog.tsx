"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateVehicleSchema, type UpdateVehicleInput } from "../schemas";
import { useUpdateVehicleMutation } from "../queries";
import type { VehicleListItem } from "../types";
import { VEHICLE_OPERATIONAL_STATUSES } from "../types";
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
import { messageFor } from "@/lib/api/errors";

interface EditVehicleDialogProps {
  vehicle: VehicleListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditVehicleDialog({
  vehicle,
  open,
  onOpenChange,
}: EditVehicleDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const updateMutation = useUpdateVehicleMutation(vehicle.id);

  const form = useForm<UpdateVehicleInput>({
    resolver: zodResolver(updateVehicleSchema),
    defaultValues: {
      make: vehicle.make ?? null,
      model: vehicle.model ?? null,
      vehicleType: vehicle.vehicleType,
      capacityValue: parseFloat(vehicle.capacityValue),
      capacityUnit: vehicle.capacityUnit,
      qualification: vehicle.qualification ?? null,
      status: vehicle.status,
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        make: vehicle.make ?? null,
        model: vehicle.model ?? null,
        vehicleType: vehicle.vehicleType,
        capacityValue: parseFloat(vehicle.capacityValue),
        capacityUnit: vehicle.capacityUnit,
        qualification: vehicle.qualification ?? null,
        status: vehicle.status,
      });
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: UpdateVehicleInput) {
    setServerError(null);
    const payload: UpdateVehicleInput = {
      make: values.make?.trim() || null,
      model: values.model?.trim() || null,
      vehicleType: values.vehicleType?.trim() || undefined,
      capacityValue: values.capacityValue,
      capacityUnit: values.capacityUnit?.trim() || undefined,
      qualification: values.qualification?.trim() || null,
      status: values.status,
    };
    try {
      await updateMutation.mutateAsync({
        data: payload,
        version: vehicle.version,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to update vehicle."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit vehicle — {vehicle.registrationNumber}</DialogTitle>
          <DialogDescription>
            Update vehicle details or operational status.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-make">Make</Label>
              <Input id="edit-make" {...form.register("make")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">Model</Label>
              <Input id="edit-model" {...form.register("model")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-vehicleType">Vehicle type</Label>
            <Input id="edit-vehicleType" {...form.register("vehicleType")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-capacityValue">Capacity</Label>
              <Input
                id="edit-capacityValue"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                {...form.register("capacityValue")}
              />
              {form.formState.errors.capacityValue && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.capacityValue.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-capacityUnit">Capacity unit</Label>
              <Input id="edit-capacityUnit" {...form.register("capacityUnit")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-qualification">Qualification</Label>
            <Input id="edit-qualification" {...form.register("qualification")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <select
              id="edit-status"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...form.register("status")}
            >
              {VEHICLE_OPERATIONAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}