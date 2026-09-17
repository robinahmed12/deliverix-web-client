"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useZones, useZonePermissions } from "../queries";
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
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { Map, Search } from "lucide-react";
import type { ZoneListItem } from "../types";
import { CreateZoneDialog } from "./create-zone-dialog";

export interface ZoneExplorerInitialFilters {
  active?: boolean;
  search?: string;
}

interface ZonesExplorerProps {
  initialResult: {
    zones: ZoneListItem[];
  };
  initialFilters: ZoneExplorerInitialFilters;
}

export function ZonesExplorer({
  initialResult,
  initialFilters,
}: ZonesExplorerProps) {
  const router = useRouter();
  const permissions = useZonePermissions();
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

  const zonesQuery = useZones(
    {
      active:
        activeFilter === ""
          ? undefined
          : activeFilter === "true"
            ? true
            : false,
      search: search || undefined,
    },
    initialResult.zones,
  );

  const zones = zonesQuery.data ?? [];

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <PageHeader
        title="Zones"
        description="Manage delivery zones, coverage areas, and delivery fees."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={submitSearch}
          className="flex w-full max-w-sm items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Search zones"
              placeholder="Search by name or code…"
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
            <option value="">All zones</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {permissions.canManage && (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              New zone
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        {zonesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : zonesQuery.isError ? (
          <ErrorState
            error={zonesQuery.error}
            onRetry={() => void zonesQuery.refetch()}
          />
        ) : zones.length === 0 ? (
          <EmptyState
            title="No zones found"
            description="No zones match the current filters."
            icon={<Map className="size-8" aria-hidden="true" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Delivery fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow
                  key={zone.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/zones/${zone.id}`)}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/zones/${zone.id}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {zone.code}
                    </Link>
                  </TableCell>
                  <TableCell>{zone.name}</TableCell>
                  <TableCell>{zone.priority}</TableCell>
                  <TableCell>
                    {zone.deliveryFee !== null ? (
                      formatCurrency(zone.deliveryFee, zone.currencyCode)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {zone.active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(zone.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateZoneDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}