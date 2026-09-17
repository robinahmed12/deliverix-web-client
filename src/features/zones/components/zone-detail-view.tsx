"use client";

import * as React from "react";
import Link from "next/link";
import {
  useZone,
  useZonePermissions,
  useUpdateZoneMutation,
} from "../queries";
import type { ZoneDetail } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { messageFor } from "@/lib/api/errors";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { ArrowLeft, MapPin } from "lucide-react";
import { EditZoneDialog } from "./edit-zone-dialog";

interface ZoneDetailViewProps {
  zoneId: string;
  initialData: ZoneDetail;
}

export function ZoneDetailView({ zoneId, initialData }: ZoneDetailViewProps) {
  const permissions = useZonePermissions();
  const [editOpen, setEditOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const detailQuery = useZone(zoneId, initialData);
  const toggleMutation = useUpdateZoneMutation(zoneId);

  const zone = detailQuery.data;

  async function handleToggle() {
    if (!zone) return;
    setActionError(null);
    try {
      await toggleMutation.mutateAsync({
        data: { active: !zone.active },
        version: zone.version,
      });
    } catch (error) {
      setActionError(messageFor(error, "Failed to update zone status."));
    }
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  if (!zone) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const areas = zone.areas ?? [];

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/zones"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to zones
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {zone.name}
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{zone.code}</Badge>
            {zone.active ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Version {zone.version}
            </span>
          </div>
        </div>
        {permissions.canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(true)}
            >
              Edit zone
            </Button>
            <Button
              type="button"
              variant={zone.active ? "outline" : "default"}
              disabled={toggleMutation.isPending}
              onClick={() => void handleToggle()}
            >
              {toggleMutation.isPending
                ? "Saving…"
                : zone.active
                  ? "Deactivate"
                  : "Activate"}
            </Button>
          </div>
        )}
      </div>

      {actionError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Zone details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Priority
              </p>
              <p className="mt-1">{zone.priority}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Delivery fee
              </p>
              <p className="mt-1">
                {zone.deliveryFee !== null ? (
                  formatCurrency(zone.deliveryFee, zone.currencyCode)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Currency
              </p>
              <p className="mt-1">{zone.currencyCode}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Created
              </p>
              <p className="mt-1">{formatDateTime(zone.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage areas</CardTitle>
            <CardDescription>
              Areas defined for this zone at creation time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {areas.length === 0 ? (
              <EmptyState
                title="No coverage areas"
                description="This zone was created without any areas."
                icon={<MapPin className="size-8" aria-hidden="true" />}
              />
            ) : (
              <ul className="space-y-2">
                {areas.map((area) => (
                  <li
                    key={area.id}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {area.name ?? "Unnamed area"}
                      </span>
                      {area.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                      {area.latitude !== null && (
                        <span>Lat {area.latitude.toFixed(4)}</span>
                      )}
                      {area.longitude !== null && (
                        <span>Lng {area.longitude.toFixed(4)}</span>
                      )}
                      {area.radiusMeters !== null && (
                        <span>Radius {area.radiusMeters.toLocaleString()} m</span>
                      )}
                      {area.latitude === null &&
                        area.longitude === null &&
                        area.radiusMeters === null && (
                          <span>No coordinates defined</span>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <EditZoneDialog
        zone={zone}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}