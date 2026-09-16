"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateDriverSchema, type UpdateDriverInput } from "../schemas";
import { useUpdateDriverMutation } from "../queries";
import type { DriverListItem } from "../types";
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

function toDateInputValue(value: unknown): string {
  if (value == null) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

interface EditDriverDialogProps {
  driver: DriverListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDriverDialog({
  driver,
  open,
  onOpenChange,
}: EditDriverDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const updateMutation = useUpdateDriverMutation(driver.id);

  const form = useForm<UpdateDriverInput>({
    resolver: zodResolver(updateDriverSchema),
    defaultValues: {
      contactPhone: driver.contactPhone,
      licenseNumber: driver.licenseNumber ?? "",
      licenseExpiry: driver.licenseExpiry
        ? new Date(driver.licenseExpiry)
        : null,
      qualification: driver.qualification ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        contactPhone: driver.contactPhone,
        licenseNumber: driver.licenseNumber ?? "",
        licenseExpiry: driver.licenseExpiry
          ? new Date(driver.licenseExpiry)
          : null,
        qualification: driver.qualification ?? "",
      });
      setServerError(null);
    }
  }, [open, driver, form]);

  async function onSubmit(values: UpdateDriverInput) {
    setServerError(null);
    const payload: UpdateDriverInput = {
      contactPhone: values.contactPhone || undefined,
      licenseNumber: values.licenseNumber || null,
      licenseExpiry:
        values.licenseExpiry instanceof Date
          ? values.licenseExpiry.toISOString()
          : values.licenseExpiry,
      qualification: values.qualification || null,
    };
    try {
      await updateMutation.mutateAsync({
        data: payload,
        version: driver.version,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to update driver."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit driver — {driver.driverCode}</DialogTitle>
          <DialogDescription>
            Update contact, license, or qualification details.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-contactPhone">Contact phone</Label>
            <Input
              id="edit-contactPhone"
              {...form.register("contactPhone")}
            />
            {form.formState.errors.contactPhone && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.contactPhone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-licenseNumber">License number</Label>
            <Input
              id="edit-licenseNumber"
              {...form.register("licenseNumber")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-licenseExpiry">License expiry</Label>
            <Input
              id="edit-licenseExpiry"
              type="date"
              value={toDateInputValue(form.watch("licenseExpiry"))}
              onChange={(e) =>
                form.setValue(
                  "licenseExpiry",
                  e.target.value ? new Date(e.target.value) : null,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-qualification">Qualification</Label>
            <Input
              id="edit-qualification"
              {...form.register("qualification")}
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
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}