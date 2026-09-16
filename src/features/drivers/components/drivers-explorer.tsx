"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDriversInfinite,
  useDriverPermissions,
} from "../queries";
import type { DriverAvailabilityState, DriverListFilters } from "../types";
import type { DriverListPage } from "../types";
import { DRIVER_AVAILABILITY_STATES } from "../types";
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
import { Users, Search } from "lucide-react";
import { CreateDriverDialog } from "./create-driver-dialog";

const STATE_VARIANTS: Record<DriverAvailabilityState, "success" | "warning" | "default" | "secondary" | "destructive"> = {
  Available: "success",
  Assigned: "default",
  OnDelivery: "warning",
  Offline: "secondary",
  Unavailable: "destructive",
};

export interface DriverExplorerInitialFilters {
  state?: DriverAvailabilityState;
  active?: boolean;
  search?: string;
}

interface DriversExplorerProps {
  initialResult: {
    drivers: DriverListPage;
  };
  initialFilters: DriverExplorerInitialFilters;
}

export function DriversExplorer({
  initialResult,
  initialFilters,
}: DriversExplorerProps) {
  const router = useRouter();
  const permissions = useDriverPermissions();
  const [stateFilter, setStateFilter] = React.useState<string>(
    initialFilters.state ?? "",
  );
  const [activeFilter, setActiveFilter] = React.useState<string>(
    initialFilters.active === undefined
      ? ""
      : initialFilters.active
        ? "true"
        : "false",
  );
  const [searchInput, setSearchInput] = React.useState(initialFilters.search ?? "");
  const [search, setSearch] = React.useState(initialFilters.search ?? "");
  const [createOpen, setCreateOpen] = React.useState(false);

  const filters: Omit<DriverListFilters, "page"> = {
    state:
      stateFilter === "" ? undefined : (stateFilter as DriverAvailabilityState),
    active:
      activeFilter === ""
        ? undefined
        : activeFilter === "true"
          ? true
          : false,
    search: search || undefined,
  };

  const driversQuery = useDriversInfinite(filters, initialResult.drivers);

  const drivers = React.useMemo(
    () => (driversQuery.data?.pages ?? []).flatMap((p) => p.drivers),
    [driversQuery.data],
  );

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Manage driver records, licenses, and availability."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={submitSearch}
          className="flex w-full max-w-sm items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Search drivers"
              placeholder="Search by code or phone…"
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
          <Label htmlFor="state-filter" className="sr-only">
            Filter by state
          </Label>
          <select
            id="state-filter"
            aria-label="Filter by state"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">All states</option>
            {DRIVER_AVAILABILITY_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <Label htmlFor="active-filter" className="sr-only">
            Filter by active status
          </Label>
          <select
            id="active-filter"
            aria-label="Filter by active status"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="">All drivers</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {permissions.canManage && (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              New driver
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        {driversQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : driversQuery.isError ? (
          <ErrorState
            error={driversQuery.error}
            onRetry={() => void driversQuery.refetch()}
          />
        ) : drivers.length === 0 ? (
          <EmptyState
            title="No drivers found"
            description="No drivers match the current filters."
            icon={<Users className="size-8" aria-hidden="true" />}
          />
        ) : (
          <div className="space-y-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow
                    key={driver.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/drivers/${driver.id}`)}
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/drivers/${driver.id}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {driver.driverCode}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATE_VARIANTS[driver.state]}>
                        {driver.state}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {driver.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>{driver.contactPhone}</TableCell>
                    <TableCell>
                      {driver.licenseNumber ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{formatDate(driver.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {driversQuery.hasNextPage && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={driversQuery.isFetchingNextPage}
                onClick={() => void driversQuery.fetchNextPage()}
              >
                {driversQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            )}
          </div>
        )}
      </div>

      <CreateDriverDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}