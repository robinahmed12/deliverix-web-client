import { z } from "zod";

export const vehicleListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: z
    .enum(["Active", "Maintenance", "Inactive"])
    .optional(),
  search: z.string().max(100).optional(),
});

export const createVehicleSchema = z.object({
  registrationNumber: z
    .string()
    .min(1, "Registration number is required")
    .max(30),
  make: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  vehicleType: z.string().min(1, "Vehicle type is required").max(50),
  capacityValue: z.coerce
    .number()
    .positive("Capacity must be greater than zero"),
  capacityUnit: z.string().min(1, "Capacity unit is required").max(20),
  qualification: z.string().max(50).nullable().optional(),
});

export const updateVehicleSchema = z.object({
  make: z.string().max(100).or(z.literal(null)).optional(),
  model: z.string().max(100).or(z.literal(null)).optional(),
  vehicleType: z.string().max(50).optional(),
  capacityValue: z.coerce.number().positive().optional(),
  capacityUnit: z.string().max(20).optional(),
  qualification: z.string().max(50).or(z.literal(null)).optional(),
  status: z.enum(["Active", "Maintenance", "Inactive"]).optional(),
});

export const allocateVehicleSchema = z.object({
  driverId: z.string().min(1, "A driver is required"),
  reasonCode: z.string().max(100).nullable().optional(),
});

export type VehicleListParams = z.input<typeof vehicleListParamsSchema>;
export type CreateVehicleInput = z.input<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.input<typeof updateVehicleSchema>;
export type AllocateVehicleInput = z.input<typeof allocateVehicleSchema>;