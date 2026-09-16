import "server-only";

import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { env } from "@/lib/env";
function isBareResourceEnvelope(body: unknown): body is { data: unknown } {
  if (typeof body !== "object" || body === null) return false;
  const record = body as Record<string, unknown>;
  return "data" in record && !Array.isArray(record.data);
}

function buildCookieHeader(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): string {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (text.length === 0) return undefined;
  return JSON.parse(text);
}

/**
 * Server-side fetch to the Express backend, forwarding the current request's
 * httpOnly cookies so RSC reads happen with the same session as the browser.
 */
export async function serverFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const cookieStore = await cookies();

  const res = await fetch(`${env.BACKEND_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      cookie: buildCookieHeader(cookieStore),
      ...(init?.headers ?? {}),
    },
  });

  if (res.ok) {
    const body = await parseJsonResponse(res);
    if (body === undefined) return undefined as T;
    if (isBareResourceEnvelope(body)) {
      return body.data as T;
    }
    return body as unknown as T;
  }

  const body = await parseJsonResponse(res);
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  throw new ApiError({
    message: typeof obj.detail === "string" ? obj.detail : res.statusText,
    kind: "http",
    status: res.status,
    code: typeof obj.code === "string" ? obj.code : undefined,
    requestId: typeof obj.requestId === "string" ? obj.requestId : undefined,
    problem: {
      status: res.status,
      detail: typeof obj.detail === "string" ? obj.detail : res.statusText,
      code: typeof obj.code === "string" ? obj.code : undefined,
      requestId: typeof obj.requestId === "string" ? obj.requestId : undefined,
    },
  });
}