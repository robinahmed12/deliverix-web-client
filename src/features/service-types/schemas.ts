import { z } from "zod";

export const serviceTypeListParamsSchema = z.object({
  active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().max(100).optional(),
});

export const createServiceTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  code: z.string().min(1, "Code is required").max(30),
  description: z.string().max(500).or(z.literal(null)).optional(),
  active: z.coerce.boolean().optional(),
});

export const updateServiceTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(150).optional(),
  description: z.string().max(500).or(z.literal(null)).optional(),
  active: z.coerce.boolean().optional(),
});

export type ServiceTypeListParams = z.input<typeof serviceTypeListParamsSchema>;
export type CreateServiceTypeInput = z.input<typeof createServiceTypeSchema>;
export type UpdateServiceTypeInput = z.input<typeof updateServiceTypeSchema>;