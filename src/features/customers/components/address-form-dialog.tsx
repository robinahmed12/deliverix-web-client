"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAddressSchema, type CreateAddressInput } from "../schemas";
import {
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useIdempotencyKey,
} from "../queries";
import type { AddressPayload, CustomerAddress } from "../types";
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

function toString(value: string | null | undefined): string {
  return value ?? "";
}

function coordinateFormValue(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function payloadFrom(
  values: CreateAddressInput,
): AddressPayload {
  const latitude = values.latitude?.trim() ?? "";
  const longitude = values.longitude?.trim() ?? "";
  return {
    label: values.label ? values.label : null,
    line1: values.line1,
    line2: values.line2 ? values.line2 : null,
    city: values.city,
    region: values.region ? values.region : null,
    postalCode: values.postalCode ? values.postalCode : null,
    country: values.country || "US",
    latitude: latitude === "" ? null : Number(latitude),
    longitude: longitude === "" ? null : Number(longitude),
    isDefault: Boolean(values.isDefault),
  };
}

interface AddressFormDialogProps {
  customerId: string;
  /** When provided the dialog edits the address; otherwise it creates one. */
  address?: CustomerAddress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddressFormDialog({
  customerId,
  address,
  open,
  onOpenChange,
}: AddressFormDialogProps) {
  const isEdit = address !== undefined;
  const getKey = useIdempotencyKey(isEdit ? "customer-address-update" : "customer-address-create");
  const [serverError, setServerError] = React.useState<string | null>(null);

  const createMutation = useCreateAddressMutation(customerId);
  const updateMutation = useUpdateAddressMutation(customerId);

  const form = useForm<CreateAddressInput>({
    resolver: zodResolver(createAddressSchema),
    defaultValues: {
      label: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postalCode: "",
      country: "US",
      latitude: "",
      longitude: "",
      isDefault: false,
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(
        address
          ? {
              label: toString(address.label),
              line1: address.line1,
              line2: toString(address.line2),
              city: address.city,
              region: toString(address.region),
              postalCode: toString(address.postalCode),
              country: address.country,
              latitude: coordinateFormValue(address.latitude),
              longitude: coordinateFormValue(address.longitude),
              isDefault: address.isDefault,
            }
          : {
              label: "",
              line1: "",
              line2: "",
              city: "",
              region: "",
              postalCode: "",
              country: "US",
              latitude: "",
              longitude: "",
              isDefault: false,
            },
      );
      setServerError(null);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: CreateAddressInput) {
    setServerError(null);
    const payload = payloadFrom(values);
    try {
      if (isEdit && address) {
        await updateMutation.mutateAsync({
          addressId: address.id,
          data: payload,
        });
      } else {
        const key = await getKey(payload);
        await createMutation.mutateAsync({ data: payload, idempotencyKey: key });
      }
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to save address."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit address" : "Add address"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the saved address for this customer."
              : "Add a saved address to this customer's address book."}
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
              <Label htmlFor="addr-label">Label</Label>
              <Input
                id="addr-label"
                placeholder="e.g. Head office"
                {...form.register("label")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-country">Country</Label>
              <Input
                id="addr-country"
                {...form.register("country")}
              />
              {form.formState.errors.country && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.country.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addr-line1">Street address</Label>
            <Input
              id="addr-line1"
              placeholder="123 Market Street"
              {...form.register("line1")}
            />
            {form.formState.errors.line1 && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.line1.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="addr-line2">Address line 2</Label>
            <Input
              id="addr-line2"
              placeholder="Suite 400"
              {...form.register("line2")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="addr-city">City</Label>
              <Input
                id="addr-city"
                {...form.register("city")}
              />
              {form.formState.errors.city && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.city.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-region">State / Region</Label>
              <Input
                id="addr-region"
                {...form.register("region")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="addr-postal">Postal code</Label>
              <Input
                id="addr-postal"
                {...form.register("postalCode")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-latitude">Latitude</Label>
              <Input
                id="addr-latitude"
                type="number"
                step="any"
                placeholder="40.7128"
                {...form.register("latitude")}
              />
              {form.formState.errors.latitude && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.latitude.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-longitude">Longitude</Label>
              <Input
                id="addr-longitude"
                type="number"
                step="any"
                placeholder="-74.0060"
                {...form.register("longitude")}
              />
              {form.formState.errors.longitude && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.longitude.message}
                </p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              {...form.register("isDefault")}
            />
            Set as default address
          </label>

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
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving…"
                : "Save address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}