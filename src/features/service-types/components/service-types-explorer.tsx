"use client";

import * as React from "react";
import { useServiceTypes, useServiceTypePermissions } from "../queries";
import type { ServiceTypeListItem } from "../types";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { formatDate } from "@/lib/utils/formatters";
import { Layers, Search, Plus } from "lucide-react";
import { CreateServiceTypeDialog } from "./create-service-type-dialog";
import { EditServiceTypeDialog } from "./edit-service-type-dialog";

interface ServiceTypesExplorerProps {
  initialResult: {
    serviceTypes: ServiceTypeListItem[];
  };
  initialFilters?: {
    active?: boolean;
    search?: string;
  };
}

export function ServiceTypesExplorer({
  initialResult,
  initialFilters,
}: ServiceTypesExplorerProps) {
  const permissions = useServiceTypePermissions();
  const [searchInput, setSearchInput] = React.useState(initialFilters?.search ?? "");
  const [search, setSearch] = React.useState(initialFilters?.search ?? "");
  const [activeFilter, setActiveFilter] = React.useState<string>(
    initialFilters?.active === undefined
      ? ""
      : initialFilters.active
        ? "true"
        : "false",
  );
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceTypeListItem | null>(null);

  const serviceTypesQuery = useServiceTypes(
    {
      active:
        activeFilter === ""
          ? undefined
          : activeFilter === "true"
            ? true
            : false,
      search: search || undefined,
    },
    initialResult.serviceTypes,
  );

  const serviceTypes = serviceTypesQuery.data ?? [];

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <PageHeader
        title="Service types"
        description="Configure service types used when placing orders."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={submitSearch}
          className="flex w-full max-w-sm items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Search service types"
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
          <select
            id="active-filter"
            aria-label="Filter by active status"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="">All types</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {permissions.canManage && (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              New service type
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        {serviceTypesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : serviceTypesQuery.isError ? (
          <ErrorState
            error={serviceTypesQuery.error}
            onRetry={() => void serviceTypesQuery.refetch()}
          />
        ) : serviceTypes.length === 0 ? (
          <EmptyState
            title="No service types found"
            description="No service types match the current filters."
            icon={<Layers className="size-8" aria-hidden="true" />}
          />
        ) : (
          <div className="space-y-2">
            {serviceTypes.map((serviceType) => (
              <div
                key={serviceType.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{serviceType.name}</span>
                    <Badge variant="outline">{serviceType.code}</Badge>
                    {serviceType.active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {serviceType.description ?? "No description"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(serviceType.createdAt)} · Version{" "}
                    {serviceType.version}
                  </p>
                </div>
                {permissions.canManage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(serviceType)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateServiceTypeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <EditServiceTypeDialog
        serviceType={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}