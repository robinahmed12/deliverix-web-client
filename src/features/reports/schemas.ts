import { z } from "zod";

const MAX_REPORT_DAYS = 90;

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");

function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`);
  return ms / (1000 * 60 * 60 * 24);
}

export const reportRangeSchema = z
  .object({
    from: dateStringSchema,
    to: dateStringSchema,
  })
  .refine((d) => d.to >= d.from, {
    message: "End date must be on or after the start date.",
    path: ["to"],
  })
  .refine((d) => daysBetween(d.from, d.to) <= MAX_REPORT_DAYS, {
    message: `Date range must not exceed ${MAX_REPORT_DAYS} days.`,
    path: ["to"],
  });

export type ReportRangeInput = z.infer<typeof reportRangeSchema>;