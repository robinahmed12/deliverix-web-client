"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createVehicleSchema, type CreateVehicleInput } from "../schemas";
import { useCreateVehicleMutation, useIdempotencyKey } from "../queries";
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

interface CreateVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateVehicleDialog({
  open,
  onOpenChange,
}: CreateVehicleDialogProps) {
  const getKey = useIdempotencyKey("vehicle-create");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const createMutation = useCreateVehicleMutation();

  const form = useForm<CreateVehicleInput>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      registrationNumber: "",
      make: "",
      model: "",
      vehicleType: "",
      capacityValue: undefined as unknown as number,
      capacityUnit: "",
      qualification: "",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: CreateVehicleInput) {
    setServerError(null);
    const payload: CreateVehicleInput = {
      registrationNumber: values.registrationNumber.trim(),
      vehicleType: values.vehicleType.trim(),
      capacityValue: values.capacityValue,
      capacityUnit: values.capacityUnit.trim(),
      make: values.make?.trim() || null,
      model: values.model?.trim() || null,
      qualification: values.qualification?.trim() || null,
    };
    const key = await getKey(payload);
    try {
      await createMutation.mutateAsync({
        data: payload,
        idempotencyKey: key,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to create vehicle."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New vehicle</DialogTitle>
          <DialogDescription>
            Register a fleet vehicle. It starts in Active status and can be
            assigned to drivers later.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration number</Label>
            <Input
              id="registrationNumber"
              placeholder="e.g. TRK-101"
              {...form.register("registrationNumber")}
            />
            {form.formState.errors.registrationNumber && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.registrationNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle type</Label>
            <Input
              id="vehicleType"
              placeholder="e.g. Van"
              {...form.register("vehicleType")}
            />
            {form.formState.errors.vehicleType && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.vehicleType.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="capacityValue">Capacity</Label>
              <Input
                id="capacityValue"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="e.g. 1000"
                {...form.register("capacityValue")}
              />
              {form.formState.errors.capacityValue && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.capacityValue.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacityUnit">Capacity unit</Label>
              <Input
                id="capacityUnit"
                placeholder="e.g. kg"
                {...form.register("capacityUnit")}
              />
              {form.formState.errors.capacityUnit && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.capacityUnit.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-make">Make (optional)</Label>
              <Input id="create-make" {...form.register("make")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-model">Model (optional)</Label>
              <Input id="create-model" {...form.register("model")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-qualification">Qualification (optional)</Label>
            <Input id="create-qualification" {...form.register("qualification")} />
            <p className="text-xs text-muted-foreground">
              e.g. temperature-controlled, box truck.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}