"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUsersInfinite, useUserPermissions } from "../queries";
import { useRoles } from "@/features/roles/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Search, ShieldCheck, UsersRound } from "lucide-react";
import { USER_STATUSES, type UserListItem, type UserStatus } from "../types";
import { InviteUserDialog } from "./invite-user-dialog";

export interface UsersExplorerInitialFilters {
  status?: UserStatus;
  role?: string;
  search?: string;
}

interface UsersExplorerProps {
  initialResult: {
    users: UserListItem[];
  };
  initialFilters: UsersExplorerInitialFilters;
}

export function UsersExplorer({ initialResult, initialFilters }: UsersExplorerProps) {
  const router = useRouter();
  const { canManage } = useUserPermissions();
  const rolesQuery = useRoles();

  const [statusFilter, setStatusFilter] = React.useState<string>(
    initialFilters.status ?? "",
  );
  const [roleFilter, setRoleFilter] = React.useState<string>(initialFilters.role ?? "");
  const [searchInput, setSearchInput] = React.useState(initialFilters.search ?? "");
  const [search, setSearch] = React.useState(initialFilters.search ?? "");
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const usersQuery = useUsersInfinite(
    {
      status:
        statusFilter === "" ? undefined : (statusFilter as UserStatus),
      role: roleFilter || undefined,
      search: search || undefined,
    },
    initialResult.users.length > 0
      ? { users: initialResult.users, page: 1, totalPages: 1, hasMore: false }
      : undefined,
  );

  const users = usersQuery.data?.pages.flatMap((page) => page.users) ?? [];

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  const roles = rolesQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage user accounts, roles, and account status."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={submitSearch}
          className="flex w-full max-w-sm items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Search users"
              placeholder="Search by name or email…"
              className="pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSearchInput("");
              }}
            >
              Clear
            </Button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="status-filter" className="sr-only">
            Filter by status
          </Label>
          <select
            id="status-filter"
            aria-label="Filter by status"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {USER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <Label htmlFor="role-filter" className="sr-only">
            Filter by role
          </Label>
          <select
            id="role-filter"
            aria-label="Filter by role"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>

          <Button asChild variant="outline" size="sm">
            <Link href="/settings/users/roles">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Roles
            </Link>
          </Button>

          {canManage && (
            <Button type="button" onClick={() => setInviteOpen(true)}>
              Invite user
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        {usersQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : usersQuery.isError ? (
          <ErrorState
            error={usersQuery.error}
            onRetry={() => void usersQuery.refetch()}
          />
        ) : users.length === 0 ? (
          <EmptyState
            title="No users found"
            description="No users match the current filters."
            icon={<UsersRound className="size-8" aria-hidden="true" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/settings/users/${user.id}`)}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/settings/users/${user.id}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {user.name}
                    </Link>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.roles.length > 0 ? user.roles.join(", ") : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell>
                    {user.mfaEnabled ? (
                      <Badge variant="success">Enabled</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {usersQuery.hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              disabled={usersQuery.isFetchingNextPage}
              onClick={() => void usersQuery.fetchNextPage()}
            >
              {usersQuery.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
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