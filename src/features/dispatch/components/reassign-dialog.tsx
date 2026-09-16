"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reassignSchema, type ReassignInput } from "../schemas";
import { useReassignMutation, useIdempotencyKey } from "../queries";
import type { DispatchQueueOrder, DriverWorkload } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface ReassignDialogProps {
  order: DispatchQueueOrder | null;
  currentDriverCode: string | null;
  drivers: DriverWorkload[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReassignDialog({
  order,
  currentDriverCode,
  drivers,
  open,
  onOpenChange,
}: ReassignDialogProps) {
  const getKey = useIdempotencyKey("dispatch-reassign");
  const [serverError, setServerError] = React.useState<string | null>(null);

  const availableDrivers = React.useMemo(
    () => drivers.filter((d) => d.state === "Available"),
    [drivers],
  );

  const reassignMutation = useReassignMutation(order?.id ?? "");

  const form = useForm<ReassignInput>({
    resolver: zodResolver(reassignSchema),
    defaultValues: { driverId: "", reasonCode: "", reasonText: null },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({ driverId: "", reasonCode: "", reasonText: null });
      setServerError(null);
    }
  }, [open, form]);

  async function onSubmit(values: ReassignInput) {
    if (!order) return;
    setServerError(null);
    const payload = {
      ...values,
      reasonText: values.reasonText || null,
      offerExpiresAt: null,
    };
    const key = await getKey(payload);
    try {
      await reassignMutation.mutateAsync({ data: payload as ReassignInput, idempotencyKey: key });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to reassign order."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign — {order?.orderNumber ?? ""}</DialogTitle>
          <DialogDescription>
            Release the current driver and offer this order to a different driver.
          </DialogDescription>
        </DialogHeader>

        {currentDriverCode && (
          <Alert>
            <AlertDescription>
              Current driver: <span className="font-medium">{currentDriverCode}</span>. This
              assignment will be released once the new offer is created.
            </AlertDescription>
          </Alert>
        )}

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reassign-driver">New driver</Label>
            <select
              id="reassign-driver"
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.watch("driverId")}
              onChange={(e) => form.setValue("driverId", e.target.value, { shouldValidate: true })}
            >
              <option value="">Select a driver…</option>
              {availableDrivers
                .filter((d) => d.driverCode !== currentDriverCode)
                .map((d) => (
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="reassign-reason">Reason</Label>
            <Input
              id="reassign-reason"
              placeholder="e.g. Driver unavailable, capacity changed"
              {...form.register("reasonCode")}
            />
            {form.formState.errors.reasonCode && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.reasonCode.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reassign-reason-text">Notes (optional)</Label>
            <Textarea
              id="reassign-reason-text"
              placeholder="Additional context…"
              value={form.watch("reasonText") ?? ""}
              onChange={(e) => form.setValue("reasonText", e.target.value || null)}
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
            <Button
              type="submit"
              disabled={reassignMutation.isPending}
            >
              {reassignMutation.isPending ? "Reassigning…" : "Reassign order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}