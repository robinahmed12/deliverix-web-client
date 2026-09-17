"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOrderSchema,
  type CreateOrderInput,
} from "../schemas";
import {
  useCreateOrderMutation,
  useCustomerSearch,
  useIdempotencyKey,
} from "../queries";
import { formatCurrency } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type {
  CustomerSummary,
  ZoneSummary,
  ServiceTypeSummary,
} from "../types";
import { messageFor } from "@/lib/api/errors";

interface CreateOrderFormProps {
  initialZones: ZoneSummary[];
  initialServiceTypes: ServiceTypeSummary[];
}

const DEFAULT_ADDRESS = {
  line1: "",
  line2: null as string | null,
  city: "",
  region: null as string | null,
  postalCode: null as string | null,
  country: "",
  latitude: null as number | null,
  longitude: null as number | null,
  contactName: null as string | null,
  contactPhone: null as string | null,
};

const DEFAULT_ITEM = {
  name: "",
  description: null as string | null,
  quantity: 1,
  weight: null as number | null,
  weightUnit: null as string | null,
  lengthCm: null as number | null,
  widthCm: null as number | null,
  heightCm: null as number | null,
};

export function CreateOrderForm({
  initialZones,
  initialServiceTypes,
}: CreateOrderFormProps) {
  const router = useRouter();
  const getKey = useIdempotencyKey();
  const createMutation = useCreateOrderMutation();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customerId: "",
      serviceTypeId: null,
      zoneId: null,
      currencyCode: "USD",
      deliveryFeeOverride: null,
      feeOverrideReason: null,
      promisedAtStart: null,
      promisedAtEnd: null,
      packageNote: null,
      pickupAddress: { ...DEFAULT_ADDRESS },
      deliveryAddress: { ...DEFAULT_ADDRESS },
      pickupInstructions: null,
      deliveryInstructions: null,
      items: [{ ...DEFAULT_ITEM }],
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  const zoneIdValue = useWatch({ control: form.control, name: "zoneId" });

  const selectedZone = React.useMemo(
    () => initialZones.find((z) => z.id === zoneIdValue) ?? null,
    [zoneIdValue, initialZones],
  );

  const [customerQuery, setCustomerQuery] = React.useState("");
  const [selectedCustomer, setSelectedCustomer] =
    React.useState<CustomerSummary | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = React.useState(false);
  const debouncedCustomerQuery = useDebouncedValue(customerQuery, 250);
  const customersQuery = useCustomerSearch(debouncedCustomerQuery);
  const customerResults = customersQuery.data?.data ?? [];

  async function onSubmit(values: CreateOrderInput) {
    setServerError(null);
    const payload = {
      ...values,
      pickupInstructions: values.pickupInstructions || null,
      deliveryInstructions: values.deliveryInstructions || null,
      promisedAtStart: values.promisedAtStart
        ? values.promisedAtStart instanceof Date
          ? values.promisedAtStart.toISOString()
          : values.promisedAtStart
        : null,
      promisedAtEnd: values.promisedAtEnd
        ? values.promisedAtEnd instanceof Date
          ? values.promisedAtEnd.toISOString()
          : values.promisedAtEnd
        : null,
    };
    const key = await getKey(payload);
    try {
      const order = await createMutation.mutateAsync({
        data: payload as CreateOrderInput,
        idempotencyKey: key,
      });
      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (error) {
      setServerError(messageFor(error, "Failed to create order."));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Order details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Customer</FormLabel>
                    {selectedCustomer ? (
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-input px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {selectedCustomer.name}
                          </p>
                          {selectedCustomer.email && (
                            <p className="truncate text-xs text-muted-foreground">
                              {selectedCustomer.email}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setCustomerQuery("");
                            setCustomerPickerOpen(false);
                            form.setValue("customerId", "", {
                              shouldValidate: false,
                            });
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <FormControl>
                        <Input
                          placeholder="Search customers by name..."
                          autoComplete="off"
                          value={customerQuery}
                          onFocus={() => setCustomerPickerOpen(true)}
                          onBlur={() =>
                            window.setTimeout(
                              () => setCustomerPickerOpen(false),
                              150,
                            )
                          }
                          onChange={(e) => {
                            setCustomerQuery(e.target.value);
                            setCustomerPickerOpen(true);
                          }}
                        />
                      </FormControl>
                    )}
                    {!selectedCustomer &&
                      customerPickerOpen &&
                      debouncedCustomerQuery.length > 0 && (
                        <div className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover text-popover-foreground shadow-md">
                          {customersQuery.isFetching &&
                            customerResults.length === 0 && (
                              <p className="px-3 py-2 text-sm text-muted-foreground">
                                Searching...
                              </p>
                            )}
                          {!customersQuery.isFetching &&
                            customerResults.length === 0 && (
                              <p className="px-3 py-2 text-sm text-muted-foreground">
                                No customers found.
                              </p>
                            )}
                          {customerResults.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                field.onChange(customer.id);
                                form.clearErrors("customerId");
                                setSelectedCustomer(customer);
                                setCustomerQuery("");
                                setCustomerPickerOpen(false);
                              }}
                            >
                              <span className="font-medium">
                                {customer.name}
                              </span>
                              {customer.email && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {customer.email}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service type</FormLabel>
                    <FormControl>
                      <select
                        className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                      >
                        <option value="">None</option>
                        {initialServiceTypes.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone</FormLabel>
                    <FormControl>
                      <select
                        className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                      >
                        <option value="">None</option>
                        {initialZones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                    {selectedZone?.deliveryFee && (
                      <p className="text-xs text-muted-foreground">
                        Zone fee:{" "}
                        {formatCurrency(
                          selectedZone.deliveryFee,
                          selectedZone.currencyCode,
                        )}
                      </p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currencyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input {...field} className="uppercase" maxLength={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="promisedAtStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promised window start</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={
                          field.value
                            ? field.value instanceof Date
                              ? field.value.toISOString().slice(0, 16)
                              : String(field.value).slice(0, 16)
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? new Date(e.target.value)
                              : null,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="promisedAtEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promised window end</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={
                          field.value
                            ? field.value instanceof Date
                              ? field.value.toISOString().slice(0, 16)
                              : String(field.value).slice(0, 16)
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? new Date(e.target.value)
                              : null,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="packageNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional note about the package..."
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value || null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <AddressSection
          form={form}
          title="Pickup address"
          name="pickupAddress"
        />

        <AddressSection
          form={form}
          title="Delivery address"
          name="deliveryAddress"
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendItem({ ...DEFAULT_ITEM })}
            >
              Add item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {itemFields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-4 rounded-lg border p-4 sm:grid-cols-4"
              >
                <FormField
                  control={form.control}
                  name={`items.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Item name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          value={field.value === 0 || field.value === "" ? "" : String(field.value ?? "")}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  {itemFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <FormField
          control={form.control}
          name="pickupInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pickup instructions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Instructions for the driver at pickup..."
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="deliveryInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery instructions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Instructions for the driver at delivery..."
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create order"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AddressSection({
  form,
  title,
  name,
}: {
  form: UseFormReturn<CreateOrderInput>;
  title: string;
  name: "pickupAddress" | "deliveryAddress";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name={`${name}.line1`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address line 1</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${name}.line2`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address line 2</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${name}.city`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${name}.region`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Region / State</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${name}.postalCode`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal code</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${name}.country`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${name}.contactName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact name</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${name}.contactPhone`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact phone</FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}