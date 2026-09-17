import { z } from "zod";

export const customerListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  search: z.string().max(100).optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
  phone: z.string().max(30).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  email: z
    .string()
    .email("Enter a valid email")
    .or(z.literal(""))
    .or(z.literal(null))
    .optional(),
  phone: z.string().max(30).or(z.literal(null)).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const createAddressSchema = z.object({
  label: z.string().max(100).optional(),
  line1: z.string().min(1, "Street address is required").max(200),
  line2: z.string().max(200).or(z.literal(null)).optional(),
  city: z.string().min(1, "City is required").max(100),
  region: z.string().max(100).or(z.literal(null)).optional(),
  postalCode: z.string().max(30).or(z.literal(null)).optional(),
  country: z.string().min(1).max(100).default("US"),
  latitude: z
    .string()
    .max(40)
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v.trim() === "" ||
        (!Number.isNaN(Number(v)) && Number(v) >= -90 && Number(v) <= 90),
      "Latitude must be between -90 and 90",
    ),
  longitude: z
    .string()
    .max(40)
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v.trim() === "" ||
        (!Number.isNaN(Number(v)) &&
          Number(v) >= -180 &&
          Number(v) <= 180),
      "Longitude must be between -180 and 180",
    ),
  isDefault: z.coerce.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

export type CustomerListParams = z.input<typeof customerListParamsSchema>;
export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
export type CreateAddressInput = z.input<typeof createAddressSchema>;
export type UpdateAddressInput = z.input<typeof updateAddressSchema>;