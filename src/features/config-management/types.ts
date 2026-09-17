export interface FailureReason {
  id: string;
  code: string;
  label: string;
  requiresText: boolean;
  active: boolean;
  createdAt: string;
}

export interface FailureReasonListResponse {
  data: FailureReason[];
}

export interface CreateFailureReasonInput {
  code: string;
  label: string;
  requiresText?: boolean;
  active?: boolean;
}

export interface UpdateFailureReasonInput {
  label?: string;
  requiresText?: boolean;
  active?: boolean;
}

export interface ProofPolicy {
  id: string;
  policyVersion: string;
  requiresRecipientName: boolean;
  requiresPhoto: boolean;
  requiresSignature: boolean;
  requiresConfirmation: boolean;
  requiresOtp: boolean;
  minPhotos: number;
  active: boolean;
  createdAt: string;
}

export interface ProofPolicyListResponse {
  data: ProofPolicy[];
}

export interface CreateProofPolicyInput {
  policyVersion: string;
  requiresRecipientName?: boolean;
  requiresPhoto?: boolean;
  requiresSignature?: boolean;
  requiresConfirmation?: boolean;
  requiresOtp?: boolean;
  minPhotos?: number;
}

export interface ProofPolicySummary {
  id: string;
  policyVersion: string;
  active: boolean;
  createdAt: string;
}

export interface SystemSetting {
  key: string;
  value: unknown;
  sensitive: boolean;
  updatedAt: string;
}

export interface SettingListResponse {
  data: SystemSetting[];
}

export interface SystemSettingUpdated {
  key: string;
  value: unknown;
  sensitive: boolean;
  updatedAt: string;
}