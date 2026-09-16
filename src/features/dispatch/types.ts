export const ASSIGNMENT_STATUSES = [
  "Offered",
  "Accepted",
  "Rejected",
  "Expired",
  "Withdrawn",
  "Released",
  "Completed",
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ACTIVE_ASSIGNMENT_STATUSES: ReadonlySet<AssignmentStatus> = new Set([
  "Offered",
  "Accepted",
]);

export interface DispatchQueueOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  readyAt: string | null;
  zoneName: string | null;
  pickupAddress: Record<string, unknown>;
  deliveryAddress: Record<string, unknown>;
}

export interface PageInfo {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface DispatchQueuePage {
  data: DispatchQueueOrder[];
  pageInfo: PageInfo;
}

export interface DriverWorkload {
  id: string;
  driverCode: string;
  name: string;
  state: string;
  activeAccepted: number;
  completedToday: number;
}

export interface DriverWorkloadsResponse {
  data: DriverWorkload[];
}

export interface AssignmentHistoryEntry {
  id: string;
  driverCode: string;
  status: AssignmentStatus;
  offeredAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  withdrawnAt: string | null;
  releasedAt: string | null;
  completedAt: string | null;
  reasonCode: string | null;
  reasonText: string | null;
}

export interface AssignmentHistoryResponse {
  data: AssignmentHistoryEntry[];
}
