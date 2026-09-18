"use client";

import * as React from "react";
import Link from "next/link";
import { useRoles } from "./queries";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { formatDate } from "@/lib/utils/formatters";
import { Shield } from "lucide-react";
import type { RoleListItem } from "./types";

interface RolesViewProps {
  initialRoles: RoleListItem[];
}

export function RolesView({ initialRoles }: RolesViewProps) {
  const rolesQuery = useRoles(initialRoles.length > 0 ? initialRoles : undefined);

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Roles define what permissions a user has. Role management is read-only."
      />

      <Button asChild variant="outline" size="sm">
        <Link href="/settings/users">Back to users</Link>
      </Button>

      <div className="mt-4">
        {rolesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : rolesQuery.isError ? (
          <ErrorState
            error={rolesQuery.error}
            onRetry={() => void rolesQuery.refetch()}
          />
        ) : (rolesQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No roles found"
            description="No roles are configured."
            icon={<Shield className="size-8" aria-hidden="true" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rolesQuery.data ?? []).map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {role.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-md flex-wrap gap-1">
                      {role.permissions.slice(0, 6).map((permission) => (
                        <Badge key={permission} variant="secondary">
                          {permission}
                        </Badge>
                      ))}
                      {role.permissions.length > 6 && (
                        <Badge variant="outline">
                          +{role.permissions.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(role.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}