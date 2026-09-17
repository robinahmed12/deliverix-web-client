"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateZoneSchema, type UpdateZoneInput } from "../schemas";
import { useUpdateZoneMutation } from "../queries";
import type { UpdateZonePayload, ZoneListItem } from "../types";
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

function feeFormValue(value: string | null | undefined): string {
  return value === null || value === undefined ? "" : value;
}

interface EditZoneDialogProps {
  zone: ZoneListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditZoneDialog({ zone, open, onOpenChange }: EditZoneDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const updateMutation = useUpdateZoneMutation(zone.id);

  const form = useForm<UpdateZoneInput>({
    resolver: zodResolver(updateZoneSchema),
    defaultValues: {
      name: zone.name,
      active: zone.active,
      priority: zone.priority,
      deliveryFee: feeFormValue(zone.deliveryFee),
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        name: zone.name,
        active: zone.active,
        priority: zone.priority,
        deliveryFee: feeFormValue(zone.deliveryFee),
      });
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: UpdateZoneInput) {
    setServerError(null);
    const payload: UpdateZonePayload = {
      name: values.name,
      active: Boolean(values.active),
      priority:
        typeof values.priority === "number"
          ? values.priority
          : Number(values.priority ?? 0),
      deliveryFee:
        values.deliveryFee?.trim() === ""
          ? null
          : values.deliveryFee
            ? Number(values.deliveryFee)
            : null,
    };
    try {
      await updateMutation.mutateAsync({
        data: payload,
        version: zone.version,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to update zone."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit zone — {zone.code}</DialogTitle>
          <DialogDescription>
            Update the zone name, priority, active state, or delivery fee.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-zone-name">Name</Label>
            <Input
              id="edit-zone-name"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-zone-priority">Priority</Label>
              <Input
                id="edit-zone-priority"
                type="number"
                min="0"
                {...form.register("priority")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-zone-fee">Delivery fee</Label>
              <Input
                id="edit-zone-fee"
                type="number"
                step="any"
                min="0"
                placeholder="Leave empty to clear"
                {...form.register("deliveryFee")}
              />
              {form.formState.errors.deliveryFee && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.deliveryFee.message}
                </p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              {...form.register("active")}
            />
            Active
          </label>

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