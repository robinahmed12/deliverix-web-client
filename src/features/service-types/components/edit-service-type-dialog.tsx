"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateServiceTypeSchema,
  type UpdateServiceTypeInput,
} from "../schemas";
import { useUpdateServiceTypeMutation } from "../queries";
import type { ServiceTypeListItem } from "../types";
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

interface EditServiceTypeDialogInnerProps {
  serviceType: ServiceTypeListItem;
  onClose: () => void;
}

function EditServiceTypeDialogInner({
  serviceType,
  onClose,
}: EditServiceTypeDialogInnerProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const updateMutation = useUpdateServiceTypeMutation(serviceType.id);

  const form = useForm<UpdateServiceTypeInput>({
    resolver: zodResolver(updateServiceTypeSchema),
    defaultValues: {
      name: serviceType.name,
      description: serviceType.description ?? "",
      active: serviceType.active,
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onClose();
  }

  async function onSubmit(values: UpdateServiceTypeInput) {
    setServerError(null);
    const payload: UpdateServiceTypeInput = {
      name: values.name,
      description: values.description ? values.description : null,
      active: values.active,
    };
    try {
      await updateMutation.mutateAsync({
        data: payload,
        version: serviceType.version,
      });
      onClose();
    } catch (error) {
      setServerError(messageFor(error, "Failed to update service type."));
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit service type — {serviceType.code}</DialogTitle>
          <DialogDescription>
            Update the name, description, or active state.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-st-name">Name</Label>
            <Input
              id="edit-st-name"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-st-description">Description</Label>
            <Textarea
              id="edit-st-description"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
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
              onClick={onClose}
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

interface EditServiceTypeDialogProps {
  serviceType: ServiceTypeListItem | null;
  onClose: () => void;
}

export function EditServiceTypeDialog({
  serviceType,
  onClose,
}: EditServiceTypeDialogProps) {
  if (serviceType === null) return null;
  return (
    <EditServiceTypeDialogInner
      key={serviceType.id}
      serviceType={serviceType}
      onClose={onClose}
    />
  );
}