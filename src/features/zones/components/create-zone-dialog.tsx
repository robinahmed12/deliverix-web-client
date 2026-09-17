"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createZoneSchema, type CreateZoneInput } from "../schemas";
import { useCreateZoneMutation, useIdempotencyKey } from "../queries";
import type { CreateZonePayload } from "../types";
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
import { Plus, Trash2 } from "lucide-react";

interface AreaRow {
  name: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
  active: boolean;
}

function emptyAreaRow(): AreaRow {
  return {
    name: "",
    latitude: "",
    longitude: "",
    radiusMeters: "",
    active: true,
  };
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

interface CreateZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateZoneDialog({
  open,
  onOpenChange,
}: CreateZoneDialogProps) {
  const getKey = useIdempotencyKey("zone-create");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [areaRows, setAreaRows] = React.useState<AreaRow[]>([]);

  const createMutation = useCreateZoneMutation();

  const form = useForm<CreateZoneInput>({
    resolver: zodResolver(createZoneSchema),
    defaultValues: {
      name: "",
      code: "",
      active: true,
      priority: 0,
      deliveryFee: "",
      currencyCode: "USD",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        name: "",
        code: "",
        active: true,
        priority: 0,
        deliveryFee: "",
        currencyCode: "USD",
      });
      setAreaRows([]);
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  function updateAreaRow(
    index: number,
    patch: Partial<AreaRow>,
  ) {
    setAreaRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function onSubmit(values: CreateZoneInput) {
    setServerError(null);
    const payload: CreateZonePayload = {
      name: values.name,
      code: values.code,
      active: Boolean(values.active),
      priority:
        typeof values.priority === "number"
          ? values.priority
          : Number(values.priority ?? 0),
      deliveryFee:
        values.deliveryFee?.trim() === ""
          ? null
          : values.deliveryFee
            ? Number(values.deliveryFee)
            : null,
      currencyCode: values.currencyCode || "USD",
      areas: areaRows
        .filter((row) => row.name.trim() !== "")
        .map((row) => ({
          name: row.name.trim(),
          latitude: numberOrNull(row.latitude),
          longitude: numberOrNull(row.longitude),
          radiusMeters: numberOrNull(row.radiusMeters),
          active: row.active,
        }))
        .filter((area) => area.name),
    };
    const key = await getKey(payload);
    try {
      await createMutation.mutateAsync({ data: payload, idempotencyKey: key });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to create zone."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New zone</DialogTitle>
          <DialogDescription>
            Create a delivery zone and optionally define its coverage areas.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zone-name">Name</Label>
              <Input
                id="zone-name"
                placeholder="Downtown"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-code">Code</Label>
              <Input
                id="zone-code"
                placeholder="ZONE-DT"
                {...form.register("code")}
              />
              {form.formState.errors.code && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="zone-priority">Priority</Label>
              <Input
                id="zone-priority"
                type="number"
                min="0"
                {...form.register("priority")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-fee">Delivery fee</Label>
              <Input
                id="zone-fee"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 9.99"
                {...form.register("deliveryFee")}
              />
              {form.formState.errors.deliveryFee && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.deliveryFee.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-currency">Currency</Label>
              <Input
                id="zone-currency"
                maxLength={3}
                {...form.register("currencyCode")}
              />
              {form.formState.errors.currencyCode && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.currencyCode.message}
                </p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              {...form.register("active")}
            />
            Active
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Coverage areas</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAreaRows((rows) => [...rows, emptyAreaRow()])}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add area
              </Button>
            </div>
            {areaRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No areas yet — zones can be created without coverage areas.
              </p>
            ) : (
              <div className="space-y-2">
                {areaRows.map((row, index) => (
                  <div key={index} className="space-y-2 rounded-lg border p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input
                        aria-label={`Area ${index + 1} name`}
                        placeholder="Area name"
                        value={row.name}
                        onChange={(e) =>
                          updateAreaRow(index, { name: e.target.value })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove area ${index + 1}`}
                        onClick={() =>
                          setAreaRows((rows) =>
                            rows.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input
                        aria-label={`Area ${index + 1} latitude`}
                        type="number"
                        step="any"
                        placeholder="Latitude"
                        value={row.latitude}
                        onChange={(e) =>
                          updateAreaRow(index, { latitude: e.target.value })
                        }
                      />
                      <Input
                        aria-label={`Area ${index + 1} longitude`}
                        type="number"
                        step="any"
                        placeholder="Longitude"
                        value={row.longitude}
                        onChange={(e) =>
                          updateAreaRow(index, { longitude: e.target.value })
                        }
                      />
                      <Input
                        aria-label={`Area ${index + 1} radius meters`}
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Radius (m)"
                        value={row.radiusMeters}
                        onChange={(e) =>
                          updateAreaRow(index, {
                            radiusMeters: e.target.value,
                          })
                        }
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input accent-primary"
                        checked={row.active}
                        onChange={(e) =>
                          updateAreaRow(index, { active: e.target.checked })
                        }
                      />
                      Active
                    </label>
                  </div>
                ))}
              </div>
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create zone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}