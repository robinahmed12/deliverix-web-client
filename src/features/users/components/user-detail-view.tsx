"use client";

import * as React from "react";
import { useUser, useUserPermissions, useUpdateUserMutation } from "../queries";
import { useCurrentUser } from "@/features/auth/queries";
import type { UserDetail as UserDetailType, UpdatableUserStatus } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { messageFor } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils/formatters";
import { KeyRound, Pencil, ShieldCheck, Smartphone } from "lucide-react";
import { EditUserDialog } from "./edit-user-dialog";
import { ManageUserRolesDialog } from "./manage-user-roles-dialog";

interface UserDetailViewProps {
  userId: string;
  initialUser: UserDetailType;
}

export function UserDetailView({ userId, initialUser }: UserDetailViewProps) {
  const { data: user } = useUser(userId, initialUser);
  const { canManage } = useUserPermissions();
  const { data: currentUser } = useCurrentUser();
  const updateMutation = useUpdateUserMutation(userId);

  const [editOpen, setEditOpen] = React.useState(false);
  const [rolesOpen, setRolesOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const isSelf = currentUser?.id === userId;

  async function setStatus(status: UpdatableUserStatus) {
    if (!user) return;
    setActionError(null);
    try {
      await updateMutation.mutateAsync({ data: { status }, version: user.version });
    } catch (error) {
      setActionError(messageFor(error, "Failed to update status."));
    }
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border p-4">
        {!user ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <StatusBadge status={user.status} />
                {isSelf && <Badge variant="outline">You</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {user.email}
                {user.phone ? ` · ${user.phone}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Joined {formatDate(user.createdAt)}
              </p>
            </div>

            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRolesOpen(true)}
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Manage roles
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit
                </Button>
              </div>
            )}
          </div>
        )}

        {user && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-1 rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <KeyRound className="size-3.5" aria-hidden="true" />
                Roles
              </div>
              <p className="text-sm font-medium">
                {user.roles.length > 0 ? user.roles.join(", ") : "None"}
              </p>
            </div>
            <div className="space-y-1 rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <Smartphone className="size-3.5" aria-hidden="true" />
                Two-factor
              </div>
              <p className="text-sm font-medium">
                {user.mfaEnabled ? "Enabled" : "Not enabled"}
              </p>
            </div>
            <div className="space-y-1 rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Version
              </div>
              <p className="text-sm font-medium">v{user.version}</p>
            </div>
          </div>
        )}
      </div>

      {canManage && user && (
        <div className="flex flex-wrap items-center gap-2">
          {user.status === "Active" && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isSelf || updateMutation.isPending}
              onClick={() => setStatus("Suspended")}
            >
              Suspend account
            </Button>
          )}
          {(user.status === "Suspended" || user.status === "Inactive") && (
            <Button
              type="button"
              size="sm"
              disabled={updateMutation.isPending}
              onClick={() => setStatus("Active")}
            >
              Reactivate
            </Button>
          )}
          {user.status === "Active" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSelf || updateMutation.isPending}
              onClick={() => setStatus("Inactive")}
            >
              Deactivate
            </Button>
          )}
        </div>
      )}

      <EditUserDialog user={user ?? null} open={editOpen} onOpenChange={setEditOpen} />
      <ManageUserRolesDialog
        user={user ?? null}
        open={rolesOpen}
        onOpenChange={setRolesOpen}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: UserDetailType["status"] }) {
  switch (status) {
    case "Active":
      return <Badge variant="success">Active</Badge>;
    case "Invited":
      return <Badge variant="warning">Invited</Badge>;
    case "Suspended":
      return <Badge variant="destructive">Suspended</Badge>;
    default:
      return <Badge variant="secondary">Inactive</Badge>;
  }
}