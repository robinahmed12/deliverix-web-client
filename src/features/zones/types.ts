export interface ZoneListItem {
  id: string;
  name: string;
  code: string;
  active: boolean;
  priority: number;
  /** Prisma Decimal serializes to a string over the wire. */
  deliveryFee: string | null;
  currencyCode: string;
  version: number;
  createdAt: string;
}

export interface ZoneArea {
  id: string;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  active: boolean;
}

export interface ZoneDetail extends ZoneListItem {
  areas: ZoneArea[];
}

export interface ZoneFilters {
  active?: boolean;
  search?: string;
}

export interface ZoneCreateAreaInput {
  name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number | null;
  active?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Wire payload types (backend `zones.schemas` mirror)                        */
/* -------------------------------------------------------------------------- */

export interface CreateZonePayload {
  name: string;
  code: string;
  active?: boolean;
  priority?: number;
  deliveryFee?: number | null;
  currencyCode?: string;
  areas?: ZoneCreateAreaInput[];
}

export interface UpdateZonePayload {
  name?: string;
  active?: boolean;
  priority?: number;
  deliveryFee?: number | null;
}