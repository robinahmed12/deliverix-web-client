import { apiFetch } from "@/lib/api/client";
import type { DriverAvailabilityState, DriverDetail } from "./types";

export interface DriverAssignmentOrder {
  id: string;
  orderNumber: string;
  status: string;
  pickupAddress: unknown;
  deliveryAddress: unknown;
  customerName?: string | null;
  customerPhone?: string | null;
  itemCount?: number;
}

export interface DriverAssignmentItem {
  id: string;
  status: "Offered" | "Accepted" | "Rejected" | "Expired" | "Withdrawn" | "Released" | "Completed";
  offerExpiresAt: string | null;
  offeredAt: string;
  acceptedAt?: string | null;
  completedAt?: string | null;
  reasonCode?: string | null;
  order: DriverAssignmentOrder;
}

export interface DriverProfileDto {
  id: string;
  driverCode: string;
  accountId: string;
  contactPhone: string;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  qualification: string | null;
  active: boolean;
  state: DriverAvailabilityState;
  version: number;
  createdAt: string;
  currentVehicle?: {
    id: string;
    registrationNumber: string;
    vehicleType: string;
    status: string;
  } | null;
}

/**
 * Fetch current authenticated driver's profile (GET /api/v1/drivers/me)
 */
export async function getMyDriverProfile(): Promise<DriverProfileDto> {
  const res = await apiFetch<DriverProfileDto | { data: DriverProfileDto }>("/drivers/me");
  if (res && typeof res === "object" && "data" in res && res.data) {
    return res.data as DriverProfileDto;
  }
  return res as DriverProfileDto;
}


/**
 * Fetch current authenticated driver's assignments (GET /api/v1/drivers/me/assignments)
 */
export async function getMyAssignments(
  status?: "open" | "all" | string,
): Promise<DriverAssignmentItem[]> {
  const query = status && status !== "open" ? `?status=${status}` : "";
  const res = await apiFetch<DriverAssignmentItem[] | { data: DriverAssignmentItem[] }>(`/drivers/me/assignments${query}`);
  if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
    return res.data;
  }
  if (Array.isArray(res)) {
    return res;
  }
  return [];
}



/**
 * Update current authenticated driver's availability state (PUT /api/v1/drivers/me/availability)
 */
export async function setMyAvailability(
  state: "Offline" | "Available" | "Unavailable",
): Promise<DriverProfileDto> {
  const res = await apiFetch<DriverProfileDto | { data: DriverProfileDto }>("/drivers/me/availability", {
    method: "PUT",
    body: JSON.stringify({ state }),
  });
  if (res && typeof res === "object" && "data" in res && res.data) {
    return res.data as DriverProfileDto;
  }
  return res as DriverProfileDto;
}


/**
 * Accept an offered assignment (POST /api/v1/assignments/:id/accept)
 */
export async function acceptAssignment(assignmentId: string): Promise<Record<string, unknown>> {
  return apiFetch(`/assignments/${assignmentId}/accept`, {
    method: "POST",
  });
}

/**
 * Reject an offered assignment (POST /api/v1/assignments/:id/reject)
 */
export async function rejectAssignment(assignmentId: string): Promise<Record<string, unknown>> {
  return apiFetch(`/assignments/${assignmentId}/reject`, {
    method: "POST",
  });
}

/**
 * Confirm pickup for assigned order (POST /api/v1/orders/:orderId/pickup)
 */
export async function confirmOrderPickup(orderId: string): Promise<Record<string, unknown>> {
  return apiFetch(`/orders/${orderId}/pickup`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Start transit for picked up order (POST /api/v1/orders/:orderId/in-transit)
 */
export async function startOrderTransit(orderId: string): Promise<Record<string, unknown>> {
  return apiFetch(`/orders/${orderId}/in-transit`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * Mark order out for delivery (POST /api/v1/orders/:orderId/out-for-delivery)
 */
export async function startOrderOutForDelivery(orderId: string): Promise<Record<string, unknown>> {
  return apiFetch(`/orders/${orderId}/out-for-delivery`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
