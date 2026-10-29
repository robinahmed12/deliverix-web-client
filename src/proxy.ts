import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

/**
 * Session + route-protection proxy (Next.js 16 replacement for middleware.ts).
 *
 * Two responsibilities:
 *
 * 1. Session rotation (unchanged from the old middleware): the Express backend
 *    owns session state via two httpOnly cookies — `access_token` (15 min) and
 *    `refresh_token` (7 days). The browser API client refreshes on 401, but
 *    server-rendered reads can't write Set-Cookie, so this proxy rotates an
 *    expired access token via `POST /auth/refresh` on page navigations and
 *    clears dead cookies when refresh fails.
 *
 * 2. Role-based route protection: before a guarded page renders, the JWT
 *    claims (`roles` + `permissions`) carried by the access token decide
 *    whether this user may reach it at all. Unauthenticated users go to
 *    /login; authenticated users lacking every required permission bounce to
 *    their universal home (/dashboard). The backend remains the real
 *    authorization boundary (RBAC-001/002) — this guard mirrors the
 *    permission-filtered navigation (RBAC-006/nav-config) so users never land
 *    on pages their session cannot use, instead of facing per-route 403s.
 */

interface SessionClaims {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

/** Rules are evaluated in order — list narrower prefixes first. `[]` = any authenticated user. */
const GUARD_RULES: Array<{ prefix: string; permissions: string[] }> = [
  // Order pages: the assigned driver reaches the POD screen via
  // `deliveries.execute` without holding `orders.view` (scoped read).
  { prefix: "/orders/new", permissions: ["orders.create"] },
  { prefix: "/orders", permissions: ["orders.view", "deliveries.execute"] },

  // Driver self-service sits under /drivers but is permission-free.
  { prefix: "/drivers/assignments", permissions: [] },
  { prefix: "/drivers", permissions: ["drivers.view", "drivers.manage", "dispatch.view-queue"] },

  { prefix: "/dashboard", permissions: [] },
  { prefix: "/dispatch", permissions: ["dispatch.view-queue"] },
  { prefix: "/vehicles", permissions: ["vehicles.view", "vehicles.manage", "drivers.view"] },
  { prefix: "/customers", permissions: ["customers.view", "customers.manage"] },
  { prefix: "/zones", permissions: ["zones.view", "zones.manage"] },
  { prefix: "/service-types", permissions: ["config.manage"] },
  { prefix: "/reports", permissions: ["reports.view"] },
  { prefix: "/audit-logs", permissions: ["audit.view"] },
  { prefix: "/notifications", permissions: ["notifications.view"] },
  { prefix: "/settings/users/roles", permissions: ["roles.manage", "users.manage"] },
  { prefix: "/settings/users", permissions: ["users.view", "users.manage"] },
  // Personal settings render for every role.
  { prefix: "/settings", permissions: [] },
];

/** Required permissions for a path; null when the path lives outside the guarded app area. */
function requiredPermissions(pathname: string): string[] | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  for (const rule of GUARD_RULES) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      return rule.permissions;
    }
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const cookies = request.cookies;
  const refreshToken = cookies.get("refresh_token")?.value;
  const accessToken = cookies.get("access_token")?.value;

  const expiration = getJwtExpiration(accessToken);
  let claims = decodeSessionClaims(accessToken);
  const rotatedSetCookies: string[] = [];
  let sessionInvalidated = false;

  // Access token missing or expired but refresh token present → rotate.
  // The rotated token is the newest source of role claims, so decode it from
  // the response's Set-Cookie headers before guarding the page.
  if ((!expiration || expiration <= Date.now() / 1000) && refreshToken) {
    const cookieHeader = cookies
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    try {
      const refreshed = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieHeader,
        },
        body: JSON.stringify({}),
      });

      if (refreshed.ok) {
        for (const setCookie of getSetCookieValues(refreshed.headers)) {
          rotatedSetCookies.push(setCookie);
        }
      } else {
        // Refresh failed → sign the browser out. Clearing is applied to every
        // outgoing response below (request-cookie mutations do not propagate
        // to redirect/next responses by themselves).
        sessionInvalidated = true;
      }
    } catch {
      // Backend unreachable → leave cookies untouched and let page fetches
      // surface dependency problems instead of guessing.
    }
  }

  if (rotatedSetCookies.length > 0) {
    claims = decodeSessionClaims(extractToken(rotatedSetCookies, "access_token")) ?? claims;
  }

  const required = requiredPermissions(request.nextUrl.pathname);

  // Unguarded pages (root redirect, (auth), (public) groups): preserve the
  // previous middleware behavior — only session rotation mattered here.
  if (required === null) {
    return finalize(NextResponse.next(), rotatedSetCookies, sessionInvalidated);
  }

  // Not signed in (never has been, token malformed, or expired and the
  // refresh was rejected) → /login with a clean cookie slate.
  if (claims === null) {
    return finalize(NextResponse.redirect(new URL("/login", request.url)), rotatedSetCookies, sessionInvalidated);
  }

  // Authenticated but none of the page's permissions → their universal home.
  const allowed = required.length === 0 || claims.permissions.some((p) => required.includes(p));
  if (!allowed) {
    return finalize(NextResponse.redirect(new URL("/dashboard", request.url)), rotatedSetCookies, sessionInvalidated);
  }

  return finalize(NextResponse.next(), rotatedSetCookies, sessionInvalidated);
}

/**
 * Applies cross-cutting cookie effects to every outgoing response: rotated
 * httpOnly tokens (they must survive redirects), and sign-out zeroing when
 * the refresh failed.
 */
function finalize(
  response: NextResponse,
  rotatedSetCookies: string[],
  sessionInvalidated: boolean,
): NextResponse {
  for (const setCookie of rotatedSetCookies) {
    response.headers.append("set-cookie", setCookie);
  }
  if (sessionInvalidated) {
    response.cookies.set("access_token", "", { path: "/", maxAge: 0 });
    response.cookies.set("refresh_token", "", { path: "/", maxAge: 0 });
  }
  return response;
}

/**
 * Decodes the JWT payload WITHOUT verifying the signature — the proxy only
 * makes routing decisions, every protected API call is re-authorized by the
 * backend from the httpOnly token itself. Nothing sensitive rides on this.
 */
function decodeSessionClaims(token: string | undefined): SessionClaims | null {
  if (!token) return null;
  const segments = token.split(".");
  if (segments.length !== 3) return null;
  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as Partial<SessionClaims> & {
      exp?: unknown;
    };
    if (typeof payload.exp === "number" && payload.exp <= Date.now() / 1000) {
      return null;
    }
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      !Array.isArray(payload.permissions)
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions,
    };
  } catch {
    return null;
  }
}

function getJwtExpiration(token: string | undefined): number | null {
  if (!token) return null;
  const segments = token.split(".");
  if (segments.length !== 3) return null;
  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
      exp?: unknown;
    };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function extractToken(setCookies: string[], name: string): string | undefined {
  for (const setCookie of setCookies) {
    const [pair] = setCookie.split(";");
    const separator = pair.indexOf("=");
    if (separator > 0 && pair.slice(0, separator).trim() === name) {
      const value = pair.slice(separator + 1).trim();
      return value.length > 0 ? value : undefined;
    }
  }
  return undefined;
}
function getSetCookieValues(headers: Headers): string[] {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

export const config = {
  // Run on page navigations only. `/api/v1/*` is proxied straight to the
  // backend (rewrites), where 401 → refresh is already handled by the
  // browser API client; letting the proxy rotate there too would cause
  // double refresh-token rotation.
  matcher: [
    "/((?!api/v1/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
