export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  requestId: string | null;
  ip: string | null;
  result: string;
  occurredAt: string;
}

export interface AuditListParams {
  cursor?: string;
  pageSize?: number;
  from?: string;
  to?: string;
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
}