"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserInput } from "../schemas";
import { useCreateUserMutation, useIdempotencyKey } from "../queries";
import { useRoles } from "@/features/roles/queries";
import type { CreateUserPayload } from "../types";
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

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const getKey = useIdempotencyKey("user-invite");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const rolesQuery = useRoles();

  const createMutation = useCreateUserMutation();

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      name: "",
      phone: "",
      roleIds: [],
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({ email: "", name: "", phone: "", roleIds: [] });
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: CreateUserInput) {
    setServerError(null);
    const payload: CreateUserPayload = {
      email: values.email,
      name: values.name,
      roleIds: values.roleIds,
      phone: values.phone?.trim() === "" ? undefined : values.phone,
    };
    const key = await getKey(payload);
    try {
      await createMutation.mutateAsync({ data: payload, idempotencyKey: key });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to invite user."));
    }
  }

  const roles = rolesQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>
            Create an account for a new user. An invitation email will be sent.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Full name</Label>
            <Input
              id="user-name"
              placeholder="Jane Smith"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="jane@example.com"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-phone">Phone (optional)</Label>
            <Input
              id="user-phone"
              placeholder="+1 555 000 0000"
              {...form.register("phone")}
            />
            {form.formState.errors.phone && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No roles available.
              </p>
            ) : (
              <div className="space-y-2 rounded-lg border p-3">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input accent-primary"
                      value={role.id}
                      {...form.register("roleIds")}
                    />
                    <span className="font-medium">{role.name}</span>
                    {role.description && (
                      <span className="text-xs text-muted-foreground">
                        — {role.description}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
            {form.formState.errors.roleIds && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.roleIds.message}
              </p>
            )}
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
              disabled={createMutation.isPending || roles.length === 0}
            >
              {createMutation.isPending ? "Inviting…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}