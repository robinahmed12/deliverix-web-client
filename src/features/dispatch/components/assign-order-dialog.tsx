"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assignOrderSchema, type AssignOrderInput } from "../schemas";
import { useCreateAssignmentMutation, useIdempotencyKey } from "../queries";
import type { DispatchQueueOrder, DriverWorkload } from "../types";
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
import { formatDateTime } from "@/lib/utils/formatters";

interface AssignOrderDialogProps {
  order: DispatchQueueOrder | null;
  drivers: DriverWorkload[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function addressLine(address: Record<string, unknown>): string {
  const line1 = typeof address.line1 === "string" ? address.line1 : "";
  const city = typeof address.city === "string" ? address.city : "";
  return [line1, city].filter(Boolean).join(", ");
}

function toLocalDatetimeString(value: unknown): string {
  if (value == null) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

export function AssignOrderDialog({
  order,
  drivers,
  open,
  onOpenChange,
}: AssignOrderDialogProps) {
  const getKey = useIdempotencyKey("dispatch-assign");
  const [serverError, setServerError] = React.useState<string | null>(null);

  const availableDrivers = React.useMemo(
    () => drivers.filter((d) => d.state === "Available"),
    [drivers],
  );

  const assignMutation = useCreateAssignmentMutation(order?.id ?? "");

  const form = useForm<AssignOrderInput>({
    resolver: zodResolver(assignOrderSchema),
    defaultValues: { driverId: "", offerExpiresAt: null },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ driverId: "", offerExpiresAt: null });
      setServerError(null);
    }
  }, [open, form]);

  const selectedDriverId = form.watch("driverId");
  const selectedDriver =
    availableDrivers.find((d) => d.id === selectedDriverId) ?? null;

  async function onSubmit(values: AssignOrderInput) {
    if (!order) return;
    setServerError(null);
    const payload = {
      ...values,
      offerExpiresAt: values.offerExpiresAt
        ? values.offerExpiresAt instanceof Date
          ? values.offerExpiresAt.toISOString()
          : values.offerExpiresAt
        : null,
    };
    const key = await getKey(payload);
    try {
      await assignMutation.mutateAsync({ data: payload as AssignOrderInput, idempotencyKey: key });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to assign driver."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign driver — {order?.orderNumber ?? ""}</DialogTitle>
          <DialogDescription>
            Offer this ready order to a driver. The driver must accept before the
            order is assigned.
          </DialogDescription>
        </DialogHeader>

        {order && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="truncate">Pickup: {addressLine(order.pickupAddress)}</p>
            <p className="truncate">Deliver to: {addressLine(order.deliveryAddress)}</p>
            {order.readyAt && <p className="text-muted-foreground">Ready {formatDateTime(order.readyAt)}</p>}
          </div>
        )}

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="driver">Driver</Label>
            <select
              id="driver"
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.watch("driverId")}
              onChange={(e) => form.setValue("driverId", e.target.value, { shouldValidate: true })}
            >
              <option value="">Select a driver…</option>
              {availableDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.driverCode})
                </option>
              ))}
            </select>
            {form.formState.errors.driverId && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.driverId.message}
              </p>
            )}
            {selectedDriver && (
              <p className="text-xs text-muted-foreground">
                Active assignment: {selectedDriver.activeAccepted} · Completed today: {selectedDriver.completedToday}
              </p>
            )}
            {availableDrivers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No drivers are currently available.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="offerExpiresAt">Offer expires at</Label>
            <Input
              id="offerExpiresAt"
              type="datetime-local"
              value={toLocalDatetimeString(form.watch("offerExpiresAt"))}
              onChange={(e) =>
                form.setValue(
                  "offerExpiresAt",
                  e.target.value ? new Date(e.target.value) : null,
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the default 5-minute offer window.
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
            <Button
              type="submit"
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? "Assigning…" : "Assign driver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}