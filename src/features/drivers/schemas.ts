import { z } from "zod";

export const driverListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  state: z
    .enum(["Offline", "Available", "Assigned", "OnDelivery", "Unavailable"])
    .optional(),
  active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().max(100).optional(),
});

export const createDriverSchema = z.object({
  accountId: z.string().min(1, "User account is required"),
  contactPhone: z.string().min(1, "Phone is required").max(30),
  licenseNumber: z.string().max(50).nullable().optional(),
  licenseExpiry: z.coerce.date().nullable().optional(),
  qualification: z.string().max(50).nullable().optional(),
  driverCode: z.string().max(30).optional(),
});

export const updateDriverSchema = z.object({
  contactPhone: z.string().max(30).optional(),
  licenseNumber: z.string().max(50).or(z.literal(null)).optional(),
  licenseExpiry: z.coerce.date().or(z.literal(null)).optional(),
  qualification: z.string().max(50).or(z.literal(null)).optional(),
  active: z.coerce.boolean().optional(),
});

export type DriverListParams = z.input<typeof driverListParamsSchema>;
export type CreateDriverInput = z.input<typeof createDriverSchema>;
export type UpdateDriverInput = z.input<typeof updateDriverSchema>;