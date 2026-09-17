"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createServiceTypeSchema,
  type CreateServiceTypeInput,
} from "../schemas";
import {
  useCreateServiceTypeMutation,
  useIdempotencyKey,
} from "../queries";
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

interface CreateServiceTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateServiceTypeDialog({
  open,
  onOpenChange,
}: CreateServiceTypeDialogProps) {
  const getKey = useIdempotencyKey("service-type-create");
  const [serverError, setServerError] = React.useState<string | null>(null);

  const createMutation = useCreateServiceTypeMutation();

  const form = useForm<CreateServiceTypeInput>({
    resolver: zodResolver(createServiceTypeSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      active: true,
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({ name: "", code: "", description: "", active: true });
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: CreateServiceTypeInput) {
    setServerError(null);
    const payload = {
      name: values.name,
      code: values.code,
      description: values.description ? values.description : null,
      active: values.active,
    };
    const key = await getKey(payload);
    try {
      await createMutation.mutateAsync({ data: payload, idempotencyKey: key });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to create service type."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New service type</DialogTitle>
          <DialogDescription>
            Create a service type that orders can use.
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
              <Label htmlFor="st-name">Name</Label>
              <Input
                id="st-name"
                placeholder="Same-day delivery"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-code">Code</Label>
              <Input
                id="st-code"
                placeholder="SAME-DAY"
                {...form.register("code")}
              />
              {form.formState.errors.code && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="st-description">Description</Label>
            <Textarea
              id="st-description"
              placeholder="Optional description"
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create service type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}