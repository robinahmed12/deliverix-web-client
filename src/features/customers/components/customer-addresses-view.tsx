"use client";

import * as React from "react";
import { Plus, MapPin, Trash2, Edit2 } from "lucide-react";
import {
  useMyAddressesQuery,
  useCreateMyAddressMutation,
  useUpdateMyAddressMutation,
  useDeleteMyAddressMutation,
  useIdempotencyKey,
} from "../queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerSupportChatWidget } from "@/features/support-rag/components/customer-support-chat-widget";
import type { CustomerAddress, AddressPayload } from "../types";

export function CustomerAddressesView() {
  const { data: addressesData, isLoading } = useMyAddressesQuery();
  const addresses: CustomerAddress[] = React.useMemo(() => {
    if (Array.isArray(addressesData)) return addressesData;
    if (addressesData && typeof addressesData === "object" && "data" in (addressesData as Record<string, unknown>)) {
      const d = (addressesData as { data: unknown }).data;
      if (Array.isArray(d)) return d as CustomerAddress[];
    }
    return [];
  }, [addressesData]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<CustomerAddress | null>(null);

  // Form State
  const [label, setLabel] = React.useState("Home");
  const [line1, setLine1] = React.useState("");
  const [line2, setLine2] = React.useState("");
  const [city, setCity] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);

  const createMutation = useCreateMyAddressMutation();
  const updateMutation = useUpdateMyAddressMutation();
  const deleteMutation = useDeleteMyAddressMutation();
  const getIdempotencyKey = useIdempotencyKey("addr-create");

  const openCreateDialog = () => {
    setEditingAddress(null);
    setLabel("Home");
    setLine1("");
    setLine2("");
    setCity("");
    setRegion("");
    setPostalCode("");
    setIsDefault(addresses?.length === 0);
    setDialogOpen(true);
  };

  const openEditDialog = (addr: CustomerAddress) => {
    setEditingAddress(addr);
    setLabel(addr.label ?? "Home");
    setLine1(addr.line1);
    setLine2(addr.line2 ?? "");
    setCity(addr.city);
    setRegion(addr.region ?? "");
    setPostalCode(addr.postalCode ?? "");
    setIsDefault(addr.isDefault);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AddressPayload = {
      label: label.trim() || "Address",
      line1: line1.trim(),
      line2: line2.trim() || null,
      city: city.trim(),
      region: region.trim() || null,
      postalCode: postalCode.trim() || null,
      country: "US",
      isDefault,
    };

    if (editingAddress) {
      await updateMutation.mutateAsync({
        addressId: editingAddress.id,
        data: payload,
      });
    } else {
      const idempotencyKey = await getIdempotencyKey(payload);
      await createMutation.mutateAsync({
        data: payload,
        idempotencyKey,
      });
    }

    setDialogOpen(false);
  };

  const handleDelete = async (addressId: string) => {
    if (confirm("Are you sure you want to remove this saved address?")) {
      await deleteMutation.mutateAsync(addressId);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Saved Addresses</h1>
          <p className="text-muted-foreground mt-1">
            Manage your delivery drop-off destinations and default shipping address.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="size-4" />
          Add New Address
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !addresses || addresses.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPin className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="font-semibold text-lg">No saved addresses</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add your home or office address for faster order placement and deliveries.
          </p>
          <Button onClick={openCreateDialog} variant="outline">
            Add First Address
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <Card key={addr.id} className="relative flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    <CardTitle className="text-base font-semibold">{addr.label ?? "Address"}</CardTitle>
                  </div>
                  {addr.isDefault && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      Default
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground pb-4">
                <p className="font-medium text-foreground">{addr.line1}</p>
                {addr.line2 && <p>{addr.line2}</p>}
                <p>
                  {addr.city}, {addr.region} {addr.postalCode}
                </p>
                <p>{addr.country}</p>
              </CardContent>
              <div className="flex items-center justify-end gap-2 p-4 pt-0 border-t">
                <Button variant="ghost" size="sm" onClick={() => openEditDialog(addr)} className="gap-1">
                  <Edit2 className="size-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(addr.id)}
                  className="text-destructive hover:bg-destructive/10 gap-1"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingAddress ? "Edit Address" : "Add Saved Address"}</DialogTitle>
              <DialogDescription>
                Provide delivery location details for courier drop-off.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="label">Address Label (e.g. Home, Work)</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Home"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="line1">Street Address</Label>
                <Input
                  id="line1"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="123 Main St"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="line2">Apartment, Suite, Unit (Optional)</Label>
                <Input
                  id="line2"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  placeholder="Apt 4B"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="New York"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="region">State / Region</Label>
                  <Input
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="NY"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="postalCode">Postal / Zip Code</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="10001"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary size-4"
                />
                <Label htmlFor="isDefault" className="text-sm cursor-pointer">
                  Set as default shipping address
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerSupportChatWidget />
    </div>
  );
}
