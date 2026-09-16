import { z } from "zod";
import { ORDER_STATUSES, type OrderStatus } from "./types";

export const orderAddressSchema = z.object({
  line1: z.string().min(1, "Address line 1 is required").max(200),
  line2: z.string().max(200).nullable().optional(),
  city: z.string().min(1, "City is required").max(100),
  region: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(30).nullable().optional(),
  country: z.string().min(1, "Country is required").max(100),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  contactName: z.string().max(150).nullable().optional(),
  contactPhone: z.string().max(30).nullable().optional(),
});

export const orderItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(200),
  description: z.string().max(500).nullable().optional(),
  quantity: z.coerce
    .number()
    .int("Must be a whole number")
    .positive("Quantity must be at least 1")
    .default(1),
  weight: z.coerce
    .number()
    .positive("Weight must be greater than 0")
    .nullable()
    .optional(),
  weightUnit: z.string().max(20).nullable().optional(),
  lengthCm: z.coerce.number().positive().nullable().optional(),
  widthCm: z.coerce.number().positive().nullable().optional(),
  heightCm: z.coerce.number().positive().nullable().optional(),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  serviceTypeId: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  currencyCode: z.string().length(3).default("USD"),
  deliveryFeeOverride: z.coerce.number().positive().nullable().optional(),
  feeOverrideReason: z.string().max(200).nullable().optional(),
  promisedAtStart: z.coerce.date().nullable().optional(),
  promisedAtEnd: z.coerce.date().nullable().optional(),
  packageNote: z.string().max(1000).nullable().optional(),
  pickupAddress: orderAddressSchema,
  deliveryAddress: orderAddressSchema,
  pickupInstructions: z.string().max(1000).nullable().optional(),
  deliveryInstructions: z.string().max(1000).nullable().optional(),
  items: z
    .array(orderItemSchema)
    .min(1, "At least one item is required")
    .max(50, "Maximum 50 items per order"),
});

export const updateOrderSchema = z.object({
  pickupAddress: orderAddressSchema.partial().optional(),
  deliveryAddress: orderAddressSchema.partial().optional(),
  pickupInstructions: z.string().max(1000).nullable().optional(),
  deliveryInstructions: z.string().max(1000).nullable().optional(),
  promisedAtStart: z.coerce.date().nullable().optional(),
  promisedAtEnd: z.coerce.date().nullable().optional(),
  packageNote: z.string().max(1000).nullable().optional(),
  items: z.array(orderItemSchema).min(1).max(50).optional(),
});

export const cancelOrderSchema = z.object({
  reasonCode: z.string().min(1, "Reason code is required").max(100),
  reasonText: z.string().max(500).nullable().optional(),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type UpdateOrderInput = z.input<typeof updateOrderSchema>;
export type CancelOrderInput = z.input<typeof cancelOrderSchema>;
export type OrderAddressInput = z.input<typeof orderAddressSchema>;
export type OrderItemInput = z.input<typeof orderItemSchema>;

export function parseOrderListParams(
  searchParams: Record<string, string | string[] | undefined>,
): { status?: OrderStatus; search?: string; pageSize: number } {
  const statusRaw =
    typeof searchParams.status === "string" ? searchParams.status : undefined;
  const status =
    statusRaw && (ORDER_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as OrderStatus)
      : undefined;
  const search =
    typeof searchParams.search === "string" ? searchParams.search : undefined;
  const pageSizeRaw =
    typeof searchParams.pageSize === "string" ? searchParams.pageSize : undefined;
  const pageSize = pageSizeRaw
    ? Math.min(Math.max(Number(pageSizeRaw) || 20, 1), 100)
    : 20;

  return { status, search, pageSize };
}