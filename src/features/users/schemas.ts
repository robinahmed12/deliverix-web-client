import { z } from "zod";
import { UPDATABLE_USER_STATUSES, USER_STATUSES } from "./types";

export const userListParamsSchema = z.object({
  status: z
    .enum(USER_STATUSES)
    .optional(),
  role: z.string().max(100).optional(),
  search: z.string().max(100).optional(),
});

export const createUserSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(200),
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(30).optional(),
  roleIds: z
    .array(z.string().min(1))
    .min(1, "Assign at least one role"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  status: z.enum(UPDATABLE_USER_STATUSES).optional(),
});

export const setUserRolesSchema = z.object({
  roleIds: z
    .array(z.string().min(1))
    .min(1, "Assign at least one role"),
});

export type UserListParams = z.input<typeof userListParamsSchema>;
export type CreateUserInput = z.input<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type SetUserRolesInput = z.input<typeof setUserRolesSchema>;