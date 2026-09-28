import { expect, request as playwrightRequest, type APIRequestContext, type APIResponse } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Creates an independent cookie jar. The `request` test fixture is already bound
 * to a single context, and this suite needs separate sessions per actor
 * (dispatcher vs. courier) so their permissions and state are isolated.
 */
export function newSession(): Promise<APIRequestContext> {
  return playwrightRequest.newContext();
}

export const API_BASE = process.env.E2E_API_BASE ?? "http://localhost:5000";
export const APP_BASE = process.env.E2E_APP_BASE ?? "http://localhost:3000";

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@deliverix.local",
  password: process.env.E2E_ADMIN_PASSWORD ?? "Deliverix-Admin-1",
};

/** Thrown for any non-2xx response so failures surface with the backend's error body. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly method: string,
    readonly path: string,
    readonly body: string,
  ) {
    super(`${method} ${path} -> ${status}: ${body}`);
    this.name = "ApiError";
  }
}

/** Reads the backend's RFC7807-ish error body, if present. */
export function errorCode(body: string): string | undefined {
  try {
    return (JSON.parse(body) as { code?: string }).code;
  } catch {
    return undefined;
  }
}

export async function expectStatus(
  response: APIResponse,
  status: number,
  label: string,
): Promise<unknown> {
  const body = await response.text();
  expect(
    response.status(),
    `${label}: expected HTTP ${status}, got ${response.status()} — body: ${body}`,
  ).toBe(status);
  if (body.length === 0) return undefined;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

export async function expectApiError(
  response: APIResponse,
  status: number,
  code: string,
  label: string,
): Promise<void> {
  const body = await response.text();
  expect(
    response.status(),
    `${label}: expected HTTP ${status}, got ${response.status()} — body: ${body}`,
  ).toBe(status);
  expect(errorCode(body), `${label}: expected error code ${code}`).toBe(code);
}

/** Performs a request and throws ApiError on non-2xx. */
export async function call(
  request: APIRequestContext,
  method: "get" | "post" | "patch" | "put" | "delete",
  path: string,
  options: {
    data?: unknown;
    headers?: Record<string, string>;
    multipart?: Record<string, unknown>;
  } = {},
): Promise<unknown> {
  const url = `${API_BASE}${path}`;
  const response = await request[method](url, {
    data: options.data as never,
    headers: options.headers,
    multipart: options.multipart as never,
  });

  if (!response.ok()) {
    throw new ApiError(response.status(), method.toUpperCase(), path, await response.text());
  }
  const text = await response.text();
  return text.length ? (JSON.parse(text) as unknown) : undefined;
}

export async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  await call(request, "post", "/api/v1/auth/login", { data: { email, password } });
}

/** Unwraps the backend's `{ data, meta }` envelope. */
export function data<T>(payload: unknown): T {
  return (payload as { data: T }).data;
}

let uniqueCounter = 0;
/** Stable-per-run unique suffix so repeated runs do not collide on unique fields. */
export function unique(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix}-${Date.now()}-${uniqueCounter}`;
}

export const PICKUP_ADDRESS = {
  line1: "12 Warehouse Road",
  city: "Dhaka",
  region: "Dhaka Division",
  postalCode: "1212",
  country: "BD",
  latitude: 23.8103,
  longitude: 90.4125,
  contactName: "Warehouse Desk",
  contactPhone: "+8801700000001",
};

export const DELIVERY_ADDRESS = {
  line1: "44 Rose Garden Lane",
  city: "Dhaka",
  region: "Dhaka Division",
  postalCode: "1205",
  country: "BD",
  latitude: 23.7461,
  longitude: 90.3942,
  contactName: "Receiver",
  contactPhone: "+8801700000002",
};

/** 1x1 PNG — the smallest valid image the upload endpoint will accept. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export interface DriverProfile {
  id: string;
  driverCode: string;
  active: boolean;
  state: string;
  version: number;
  contactPhone: string;
}

export interface DriverDetail extends DriverProfile {
  currentVehicle: { id: string; status: string } | null;
}

/**
 * Returns the driver profile bound to the given account, creating it if absent.
 * The backend allows only one profile per account, so tests must reuse rather
 * than re-create it. Also forces the profile back to an active/available state
 * so a previous run's deactivation cannot poison the next one.
 */
export async function ensureDriverProfile(
  request: APIRequestContext,
  accountId: string,
  contactPhone: string,
): Promise<DriverProfile> {
  const existing = await request.get(`${API_BASE}/api/v1/drivers/me`);
  let profile: DriverProfile;

  if (existing.ok()) {
    profile = data<DriverProfile>(await existing.json());
    if (!profile.active) {
      profile = data<DriverProfile>(
        await call(request, "patch", `/api/v1/drivers/${profile.id}`, {
          headers: { "If-Match": String(profile.version) },
          data: { active: true },
        }),
      );
    }
  } else {
    profile = data<DriverProfile>(
      await call(request, "post", "/api/v1/drivers", {
        data: {
          accountId,
          contactPhone,
          driverCode: unique("E2EDRV").slice(0, 30),
          qualification: "E2E",
        },
      }),
    );
  }

  // Eligibility requires the Available state.
  await call(request, "put", "/api/v1/drivers/me/availability", {
    data: { state: "Available" },
  });

  return profile;
}

/**
 * Ensures the driver has an operational vehicle. Allocation closes any previous
 * open allocation first, so re-running is safe.
 */
export async function ensureDriverVehicle(
  request: APIRequestContext,
  driverId: string,
): Promise<void> {
  const detail = data<DriverDetail>(
    await call(request, "get", `/api/v1/drivers/${driverId}`),
  );
  if (detail.currentVehicle?.status === "Active") return;

  const vehicle = data<{ id: string }>(
    await call(request, "post", "/api/v1/vehicles", {
      data: {
        registrationNumber: unique("E2E").slice(0, 30),
        vehicleType: "Van",
        capacityValue: 50,
        capacityUnit: "kg",
      },
    }),
  );
  await call(request, "post", `/api/v1/vehicles/${vehicle.id}/allocate`, {
    data: { driverId },
  });
}

let phoneCounter = 0;

/**
 * A unique customer phone. `phone` is a uniqueness constraint server-side, so
 * two calls in the same run must not collide — the millisecond timestamp alone
 * is not enough, so a per-run counter is mixed in.
 */
export function uniquePhone(): string {
  phoneCounter += 1;
  return `+8801${String(Date.now()).slice(-7)}${String(phoneCounter).padStart(2, "0")}`;
}

/**
 * Credentials for the driver account created by e2e/global-setup.ts.
 * A fresh account per run is required — see the note in provision-driver.ts.
 */
export function provisionedDriver(): { email: string; password: string } {
  const path = resolve(__dirname, "..", ".e2e-driver.json");
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}. The Playwright global setup should have created it — ` +
        `run the suite via \`npm run test:e2e\`, not a bare spec file.`,
    );
  }
  return JSON.parse(readFileSync(path, "utf8")) as { email: string; password: string };
}
