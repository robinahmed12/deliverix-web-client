import { z } from "zod";

export const zoneListParamsSchema = z.object({
  active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().max(100).optional(),
});

export const zoneAreaInputSchema = z.object({
  name: z.string().max(100).or(z.literal(null)).optional(),
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
  radiusMeters: z
    .string()
    .max(40)
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v.trim() === "" ||
        (!Number.isNaN(Number(v)) && Number(v) > 0),
      "Radius must be greater than 0",
    ),
  active: z.coerce.boolean().optional(),
});

export const createZoneSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  code: z.string().min(1, "Code is required").max(30),
  active: z.coerce.boolean().optional(),
  priority: z.coerce.number().int().min(0).optional(),
  deliveryFee: z
    .string()
    .max(40)
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v.trim() === "" ||
        (!Number.isNaN(Number(v)) && Number(v) > 0),
      "Delivery fee must be greater than 0",
    ),
  currencyCode: z.string().length(3, "Use a 3-letter currency code").default("USD"),
  areas: z.array(zoneAreaInputSchema).optional(),
});

export const updateZoneSchema = z.object({
  name: z.string().min(1, "Name is required").max(150).optional(),
  active: z.coerce.boolean().optional(),
  priority: z.coerce.number().int().min(0).optional(),
  deliveryFee: z
    .string()
    .max(40)
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v.trim() === "" ||
        (!Number.isNaN(Number(v)) && Number(v) > 0),
      "Delivery fee must be greater than 0",
    ),
});

export type ZoneListParams = z.input<typeof zoneListParamsSchema>;
export type CreateZoneInput = z.input<typeof createZoneSchema>;
export type UpdateZoneInput = z.input<typeof updateZoneSchema>;