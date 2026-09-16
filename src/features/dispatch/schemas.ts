import { z } from "zod";

export const assignOrderSchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  offerExpiresAt: z.coerce.date().nullable().optional(),
});

export const reassignSchema = z.object({
  driverId: z.string().min(1, "New driver is required"),
  reasonCode: z.string().min(1, "Reason is required").max(100),
  reasonText: z.string().max(500).nullable().optional(),
  offerExpiresAt: z.coerce.date().nullable().optional(),
});

export const withdrawAssignmentSchema = z.object({
  reasonCode: z.string().min(1, "Reason is required").max(100),
  reasonText: z.string().max(500).nullable().optional(),
});

export type AssignOrderInput = z.input<typeof assignOrderSchema>;
export type ReassignInput = z.input<typeof reassignSchema>;
export type WithdrawAssignmentInput = z.input<typeof withdrawAssignmentSchema>;
