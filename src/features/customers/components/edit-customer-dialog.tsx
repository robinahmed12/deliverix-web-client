"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateCustomerSchema, type UpdateCustomerInput } from "../schemas";
import { useUpdateCustomerMutation } from "../queries";
import type { CustomerListItem } from "../types";
import { CUSTOMER_STATUSES } from "../types";
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

function toEmailFormValue(value: string | null | undefined): string {
  return value ?? "";
}

interface EditCustomerDialogProps {
  customer: CustomerListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCustomerDialog({
  customer,
  open,
  onOpenChange,
}: EditCustomerDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const updateMutation = useUpdateCustomerMutation(customer.id);

  const form = useForm<UpdateCustomerInput>({
    resolver: zodResolver(updateCustomerSchema),
    defaultValues: {
      name: customer.name,
      email: toEmailFormValue(customer.email),
      phone: customer.phone ?? "",
      status: customer.status,
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        name: customer.name,
        email: toEmailFormValue(customer.email),
        phone: customer.phone ?? "",
        status: customer.status,
      });
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: UpdateCustomerInput) {
    setServerError(null);
    const payload: UpdateCustomerInput = {
      name: values.name,
      email:
        values.email === "" || values.email === null ? null : values.email,
      phone: values.phone ? values.phone : null,
      status: values.status,
    };
    try {
      await updateMutation.mutateAsync({
        data: payload,
        version: customer.version,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to update customer."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit customer — {customer.name}</DialogTitle>
          <DialogDescription>
            Update contact details or operational status.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty to clear the email.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              {...form.register("phone")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <select
              id="edit-status"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...form.register("status")}
            >
              {CUSTOMER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "active" ? "Active" : "Inactive"}
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