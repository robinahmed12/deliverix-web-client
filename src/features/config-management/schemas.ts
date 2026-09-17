import { z } from "zod";

export const failureReasonFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(50, "Code must be at most 50 characters."),
  label: z
    .string()
    .trim()
    .min(1, "Label is required.")
    .max(200, "Label must be at most 200 characters."),
  requiresText: z.boolean(),
  active: z.boolean(),
});

export type FailureReasonFormValues = z.infer<typeof failureReasonFormSchema>;

export const failureReasonEditSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Label is required.")
    .max(200, "Label must be at most 200 characters."),
  requiresText: z.boolean(),
});

export const proofPolicyFormSchema = z.object({
  policyVersion: z
    .string()
    .trim()
    .min(1, "Policy version is required.")
    .max(50, "Policy version must be at most 50 characters."),
  requiresRecipientName: z.boolean(),
  requiresPhoto: z.boolean(),
  requiresSignature: z.boolean(),
  requiresConfirmation: z.boolean(),
  requiresOtp: z.boolean(),
  minPhotos: z
    .number()
    .int("Minimum photos must be a whole number.")
    .min(0, "Minimum photos cannot be negative."),
});

export type ProofPolicyFormValues = z.infer<typeof proofPolicyFormSchema>;

export const settingValueSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, "Value is required.")
    .refine((value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }, "Value must be valid JSON."),
});

export type SettingValueFormValues = z.infer<typeof settingValueSchema>;