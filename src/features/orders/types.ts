export const ORDER_STATUSES = [
  "Pending",
  "ReadyForPickup",
  "Assigned",
  "PickedUp",
  "InTransit",
  "OutForDelivery",
  "Failed",
  "ReturnInProgress",
  "Delivered",
  "Cancelled",
  "Returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TERMINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "Delivered",
  "Cancelled",
  "Failed",
  "Returned",
]);

export const CANCELLABLE_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "Pending",
  "ReadyForPickup",
]);

export const EDITABLE_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "Pending",
  "ReadyForPickup",
]);

export interface OrderAddress {
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
}

export interface OrderItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  weight: string | null;
  weightUnit: string | null;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerId: string;
  serviceTypeId: string | null;
  zoneId: string | null;
  pickupAddress: OrderAddress;
  deliveryAddress: OrderAddress;
  pickupInstructions: string | null;
  deliveryInstructions: string | null;
  promisedAtStart: string | null;
  promisedAtEnd: string | null;
  deliveryFee: string | null;
  currencyCode: string;
  packageNote: string | null;
  readyAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  failedAt: string | null;
  returnedAt: string | null;
  items: OrderItem[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistoryEntry {
  fromStatus: string;
  toStatus: string;
  reasonCode: string | null;
  reasonText: string | null;
  actorType: string;
  version: number;
  createdAt: string;
}

export interface OrderNote {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
}

export const PROOF_EVIDENCE_TYPES = [
  "RecipientName",
  "Photo",
  "Signature",
  "ConfirmationFlag",
  "Otp",
] as const;

export type ProofEvidenceType = (typeof PROOF_EVIDENCE_TYPES)[number];

export const PROOF_STATUSES = ["Pending", "Accepted", "Rejected"] as const;

export type ProofStatus = (typeof PROOF_STATUSES)[number];

export const PROOF_FILE_STATUSES = [
  "Pending",
  "Accepted",
  "Rejected",
  "FailedProcessing",
] as const;

export type ProofFileStatus = (typeof PROOF_FILE_STATUSES)[number];

export interface DeliveryProofFile {
  id: string;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  status: ProofFileStatus;
}

export interface DeliveryProof {
  id: string;
  evidenceType: ProofEvidenceType;
  evidenceValue: string | null;
  confirmationFlag: boolean | null;
  status: ProofStatus;
  submittedById: string | null;
  submittedAt: string | null;
  correctedById: string | null;
  correctedAt: string | null;
  file: DeliveryProofFile | null;
  signedUrl: string | null;
  version: number;
  createdAt: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  accountId: string | null;
  version: number;
  createdAt: string;
}

export interface CustomerPageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ZoneSummary {
  id: string;
  name: string;
  code: string;
  active: boolean;
  priority: number;
  deliveryFee: string | null;
  currencyCode: string;
  version: number;
  createdAt: string;
}

export interface ServiceTypeSummary {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  version: number;
  createdAt: string;
}

export interface OrderListFilters {
  status?: OrderStatus;
  search?: string;
}

export interface OrderListParams extends OrderListFilters {
  cursor?: string;
  pageSize?: number;
  customerId?: string;
}

export interface OrderPage {
  orders: Order[];
  nextCursor: string | null;
  hasMore: boolean;
}