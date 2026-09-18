"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserSchema, type UpdateUserInput } from "../schemas";
import { useUpdateUserMutation } from "../queries";
import { useCurrentUser } from "@/features/auth/queries";
import type { UpdateUserPayload, UserDetail } from "../types";
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

interface EditUserDialogProps {
  user: UserDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const { data: currentUser } = useCurrentUser();

  const isSelf = currentUser?.id === user?.id;

  const updateMutation = useUpdateUserMutation(user?.id ?? "");

  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      phone: "",
      status: "Active",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && user) {
      form.reset({
        name: user.name,
        phone: user.phone ?? "",
        status: "Active",
      });
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: UpdateUserInput) {
    if (!user) return;
    setServerError(null);
    const payload: UpdateUserPayload = {
      name: values.name,
      phone: values.phone === "" ? null : values.phone,
      status: isSelf ? undefined : values.status,
    };
    try {
      await updateMutation.mutateAsync({ data: payload, version: user.version });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to update user."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update profile details for {user?.name ?? "this user"}.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
            <AlertDescription className="text-xs">
              If the record changed elsewhere, cancel and reopen to refresh.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-user-name">Full name</Label>
            <Input id="edit-user-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-user-phone">Phone</Label>
            <Input
              id="edit-user-phone"
              placeholder="Leave blank to clear"
              {...form.register("phone")}
            />
            {form.formState.errors.phone && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          {!isSelf && (
            <div className="space-y-2">
              <Label htmlFor="edit-user-status">Status</Label>
              <select
                id="edit-user-status"
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...form.register("status")}
              >
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Inactive">Inactive</option>
              </select>
              {form.formState.errors.status && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.status.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                You cannot change your own status.
              </p>
            </div>
          )}

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