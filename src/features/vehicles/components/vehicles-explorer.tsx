"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useVehiclesInfinite,
  useVehiclePermissions,
} from "../queries";
import type { VehicleListFilters, VehicleOperationalStatus } from "../types";
import type { VehicleListPage } from "../types";
import { VEHICLE_OPERATIONAL_STATUSES } from "../types";
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
import { Truck, Search } from "lucide-react";
import { CreateVehicleDialog } from "./create-vehicle-dialog";

const STATUS_VARIANTS: Record<
  VehicleOperationalStatus,
  "success" | "warning" | "default" | "secondary" | "destructive"
> = {
  Active: "success",
  Maintenance: "warning",
  Inactive: "secondary",
};

export interface VehicleExplorerInitialFilters {
  status?: VehicleOperationalStatus;
  search?: string;
}

interface VehiclesExplorerProps {
  initialResult: {
    vehicles: VehicleListPage;
  };
  initialFilters: VehicleExplorerInitialFilters;
}

export function VehiclesExplorer({
  initialResult,
  initialFilters,
}: VehiclesExplorerProps) {
  const router = useRouter();
  const permissions = useVehiclePermissions();
  const [statusFilter, setStatusFilter] = React.useState<string>(
    initialFilters.status ?? "",
  );
  const [searchInput, setSearchInput] = React.useState(initialFilters.search ?? "");
  const [search, setSearch] = React.useState(initialFilters.search ?? "");
  const [createOpen, setCreateOpen] = React.useState(false);

  const filters: Omit<VehicleListFilters, "page"> = {
    status:
      statusFilter === ""
        ? undefined
        : (statusFilter as VehicleOperationalStatus),
    search: search || undefined,
  };

  const vehiclesQuery = useVehiclesInfinite(filters, initialResult.vehicles);

  const vehicles = React.useMemo(
    () => (vehiclesQuery.data?.pages ?? []).flatMap((p) => p.vehicles),
    [vehiclesQuery.data],
  );

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description="Manage the fleet: registration, status, and allocation."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={submitSearch}
          className="flex w-full max-w-sm items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Search vehicles"
              placeholder="Search by registration…"
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
            {VEHICLE_OPERATIONAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {permissions.canManage && (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              New vehicle
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        {vehiclesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : vehiclesQuery.isError ? (
          <ErrorState
            error={vehiclesQuery.error}
            onRetry={() => void vehiclesQuery.refetch()}
          />
        ) : vehicles.length === 0 ? (
          <EmptyState
            title="No vehicles found"
            description="No vehicles match the current filters."
            icon={<Truck className="size-8" aria-hidden="true" />}
          />
        ) : (
          <div className="space-y-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow
                    key={vehicle.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/vehicles/${vehicle.id}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {vehicle.registrationNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{vehicle.vehicleType}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[vehicle.status]}>
                        {vehicle.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {vehicle.capacityValue} {vehicle.capacityUnit}
                    </TableCell>
                    <TableCell>
                      {vehicle.qualification ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(vehicle.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {vehiclesQuery.hasNextPage && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={vehiclesQuery.isFetchingNextPage}
                onClick={() => void vehiclesQuery.fetchNextPage()}
              >
                {vehiclesQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            )}
          </div>
        )}
      </div>

      <CreateVehicleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}