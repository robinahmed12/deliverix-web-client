"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDriverSchema, type CreateDriverInput } from "../schemas";
import {
  useCreateDriverMutation,
  useIdempotencyKey,
  useUserSearch,
} from "../queries";
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
import { Search, X } from "lucide-react";

interface CreateDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDriverDialog({
  open,
  onOpenChange,
}: CreateDriverDialogProps) {
  const getKey = useIdempotencyKey("driver-create");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [accountSearch, setAccountSearch] = React.useState("");

  const createMutation = useCreateDriverMutation();
  const usersQuery = useUserSearch(accountSearch);

  const form = useForm<CreateDriverInput>({
    resolver: zodResolver(createDriverSchema),
    defaultValues: {
      accountId: "",
      contactPhone: "",
      licenseNumber: "",
      licenseExpiry: null,
      qualification: "",
      driverCode: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset();
      setServerError(null);
      setAccountSearch("");
    }
  }, [open, form]);

  const accountId = form.watch("accountId");
  const matchedAccount =
    (usersQuery.data ?? []).find((u) => u.id === accountId) ?? null;

  const users = React.useMemo(
    () =>
      (usersQuery.data ?? []).filter((u) => u.id !== accountId),
    [usersQuery.data, accountId],
  );

  async function onSubmit(values: CreateDriverInput) {
    setServerError(null);
    const payload = {
      ...values,
      licenseExpiry:
        values.licenseExpiry instanceof Date
          ? values.licenseExpiry.toISOString()
          : values.licenseExpiry,
    };
    const key = await getKey(payload);
    try {
      await createMutation.mutateAsync({
        data: payload as CreateDriverInput,
        idempotencyKey: key,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(messageFor(error, "Failed to create driver."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New driver</DialogTitle>
          <DialogDescription>
            Link a user account to a driver profile. The backend derives the
            driver code automatically unless you provide one.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>User account</Label>
            {matchedAccount ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {matchedAccount.name || matchedAccount.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {matchedAccount.email}
                    {matchedAccount.roles.length > 0
                      ? ` · ${matchedAccount.roles.join(", ")}`
                      : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    form.setValue("accountId", "", { shouldValidate: true });
                    setAccountSearch("");
                  }}
                >
                  <X className="size-4" aria-hidden="true" />
                  <span className="sr-only">Remove</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    aria-label="Search user accounts"
                    placeholder="Search users by name or email…"
                    className="pl-8"
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                  />
                </div>
                {accountSearch && usersQuery.isLoading && (
                  <p className="text-sm text-muted-foreground">Searching…</p>
                )}
                {accountSearch &&
                  !usersQuery.isLoading &&
                  usersQuery.isSuccess &&
                  users.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No users found.
                    </p>
                  )}
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border">
                  {users.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50"
                        onClick={() =>
                          form.setValue("accountId", u.id, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <span className="block truncate font-medium">
                          {u.name || u.email}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {u.email}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {form.formState.errors.accountId && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.accountId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact phone</Label>
            <Input
              id="contactPhone"
              placeholder="+1 555 000 1234"
              {...form.register("contactPhone")}
            />
            {form.formState.errors.contactPhone && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.contactPhone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="driverCode">Driver code</Label>
            <Input
              id="driverCode"
              placeholder="e.g. DRV-003 (optional)"
              {...form.register("driverCode")}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the backend default.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License number</Label>
            <Input
              id="licenseNumber"
              {...form.register("licenseNumber")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseExpiry">License expiry</Label>
            <Input
              id="licenseExpiry"
              type="date"
              value={
                form.watch("licenseExpiry") instanceof Date
                  ? (form.watch("licenseExpiry") as Date).toISOString().slice(0, 10)
                  : ""
              }
              onChange={(e) =>
                form.setValue(
                  "licenseExpiry",
                  e.target.value ? new Date(e.target.value) : null,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qualification">Qualification</Label>
            <Input
              id="qualification"
              {...form.register("qualification")}
            />
          </div>

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
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create driver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}