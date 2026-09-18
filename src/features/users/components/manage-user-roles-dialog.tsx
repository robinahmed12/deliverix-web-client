"use client";

import * as React from "react";
import { useRoles } from "@/features/roles/queries";
import { useReplaceUserRolesMutation } from "../queries";
import type { UserDetail } from "../types";
import { Button } from "@/components/ui/button";
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

interface ManageUserRolesDialogProps {
  user: UserDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageUserRolesDialog({
  user,
  open,
  onOpenChange,
}: ManageUserRolesDialogProps) {
  const [selectedNames, setSelectedNames] = React.useState<string[]>([]);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const rolesQuery = useRoles();

  const replaceMutation = useReplaceUserRolesMutation(user?.id ?? "");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && user) {
      setSelectedNames(user.roles);
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  const roles = rolesQuery.data ?? [];

  function toggleRole(name: string) {
    setSelectedNames((current) =>
      current.includes(name)
        ? current.filter((value) => value !== name)
        : [...current, name],
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setServerError(null);
    const roleIds = roles
      .filter((role) => selectedNames.includes(role.name))
      .map((role) => role.id);
    try {
      await replaceMutation.mutateAsync({ roleIds });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to update roles."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage roles</DialogTitle>
          <DialogDescription>
            Set which roles {user?.name ?? "this user"} belongs to.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No roles available.</p>
            ) : (
              <div className="space-y-2 rounded-lg border p-3">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input accent-primary"
                      checked={selectedNames.includes(role.name)}
                      onChange={() => toggleRole(role.name)}
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
            {selectedNames.length === 0 && !serverError && (
              <p className="text-sm font-medium text-destructive">
                Assign at least one role.
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
              disabled={replaceMutation.isPending || roles.length === 0}
            >
              {replaceMutation.isPending ? "Saving…" : "Save roles"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}