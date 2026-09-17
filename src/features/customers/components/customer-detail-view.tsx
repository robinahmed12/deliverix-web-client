"use client";

import * as React from "react";
import Link from "next/link";
import {
  useCustomer,
  useCustomerAddresses,
  useCustomerPermissions,
  useUpdateCustomerMutation,
  useDeleteAddressMutation,
} from "../queries";
import type { CustomerAddress, CustomerDetail } from "../types";
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
import { formatDateTime } from "@/lib/utils/formatters";
import { ArrowLeft, MapPin, Plus } from "lucide-react";
import { EditCustomerDialog } from "./edit-customer-dialog";
import { AddressFormDialog } from "./address-form-dialog";

interface CustomerDetailViewProps {
  customerId: string;
  initialData: CustomerDetail;
}

export function CustomerDetailView({
  customerId,
  initialData,
}: CustomerDetailViewProps) {
  const permissions = useCustomerPermissions();
  const [editOpen, setEditOpen] = React.useState(false);
  const [addressOpen, setAddressOpen] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<CustomerAddress | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const detailQuery = useCustomer(customerId, initialData);
  const addressesQuery = useCustomerAddresses(customerId);
  const updateMutation = useUpdateCustomerMutation(customerId);
  const deleteAddressMutation = useDeleteAddressMutation(customerId);

  const customer = detailQuery.data;
  const addresses = addressesQuery.data;

  async function handleToggleStatus() {
    if (!customer) return;
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        data: {
          status: customer.status === "active" ? "inactive" : "active",
        },
        version: customer.version,
      });
    } catch (error) {
      setActionError(messageFor(error, "Failed to update customer status."));
    }
  }

  async function handleDeleteAddress(addressId: string) {
    setActionError(null);
    try {
      await deleteAddressMutation.mutateAsync(addressId);
      setConfirmingDeleteId(null);
    } catch (error) {
      setActionError(messageFor(error, "Failed to delete the address."));
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

  if (!customer) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to customers
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {customer.name}
          </h1>
          <div className="flex items-center gap-2">
            {customer.status === "active" ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Version {customer.version}
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
              Edit details
            </Button>
            <Button
              type="button"
              variant={customer.status === "inactive" ? "default" : "outline"}
              disabled={updateMutation.isPending}
              onClick={() => void handleToggleStatus()}
            >
              {updateMutation.isPending
                ? "Saving…"
                : customer.status === "active"
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
            <CardTitle>Customer details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Email
                </p>
                <p className="mt-1">
                  {customer.email ?? <span className="text-muted-foreground">—</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Phone
                </p>
                <p className="mt-1">
                  {customer.phone ?? <span className="text-muted-foreground">—</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Account ID
                </p>
                <p className="mt-1">
                  {customer.accountId ?? <span className="text-muted-foreground">—</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Created
                </p>
                <p className="mt-1">{formatDateTime(customer.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Address book</CardTitle>
              <CardDescription>
                Saved shipping and pickup locations.
              </CardDescription>
            </div>
            {permissions.canManage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingAddress(null);
                  setAddressOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add address
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {addressesQuery.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : addressesQuery.isError ? (
              <ErrorState
                error={addressesQuery.error}
                onRetry={() => void addressesQuery.refetch()}
              />
            ) : (addresses ?? []).length === 0 ? (
              permissions.canManage ? (
                <EmptyState
                  title="No addresses yet"
                  description="Add a saved address to reuse it when placing orders."
                  icon={<MapPin className="size-8" aria-hidden="true" />}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No saved addresses.
                </p>
              )
            ) : (
              <ul className="space-y-2">
                {(addresses ?? []).map((address) => (
                  <li
                    key={address.id}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {address.label && (
                            <span className="font-medium">{address.label}</span>
                          )}
                          {address.isDefault && (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </div>
                        <p>
                          {address.line1}
                          {address.line2 ? `, ${address.line2}` : ""}
                        </p>
                        <p className="text-muted-foreground">
                          {address.city}
                          {address.region ? `, ${address.region}` : ""}{" "}
                          {address.postalCode
                            ? `${address.postalCode} · ${address.country}`
                            : `· ${address.country}`}
                        </p>
                        {(address.latitude !== null || address.longitude !== null) && (
                          <p className="text-xs text-muted-foreground">
                            {address.latitude?.toFixed(4)}
                            {address.latitude !== null && address.longitude !== null
                              ? ", "
                              : " / "}
                            {address.longitude?.toFixed(4)}
                          </p>
                        )}
                      </div>
                      {permissions.canManage && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAddress(address);
                              setAddressOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          {confirmingDeleteId === address.id ? (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={deleteAddressMutation.isPending}
                              onClick={() => void handleDeleteAddress(address.id)}
                            >
                              {deleteAddressMutation.isPending
                                ? "Deleting…"
                                : "Confirm"}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setConfirmingDeleteId(address.id);
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <EditCustomerDialog
        customer={customer}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AddressFormDialog
        customerId={customerId}
        address={editingAddress ?? undefined}
        open={addressOpen}
        onOpenChange={setAddressOpen}
      />
    </div>
  );
}