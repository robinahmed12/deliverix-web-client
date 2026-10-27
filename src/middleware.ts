import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

/**
 * Session middleware.
 *
 * The Express backend owns session state via two httpOnly cookies:
 * `access_token` (15 min) and `refresh_token` (7 days). The browser-side
 * API client (`src/lib/api/client.ts`) already refreshes on 401, but
 * server-rendered reads (`src/lib/api/server-client.ts`) cannot refresh —
 * RSC code can't write Set-Cookie. So a hard reload after the access token
 * expires would throw 401 from server components.
 *
 * This middleware closes that gap: on page (not API) requests whose access
 * token is missing or expired, it calls the backend `POST /auth/refresh`
 * with the forwarded cookies and appends the rotated Set-Cookie headers to
 * the outgoing response. If refresh fails, it clears the session cookies so
 * the auth layouts/redirects treat the user as signed out instead of
 * bouncing between /(auth) and /(app).
 */
export async function middleware(request: NextRequest) {
  const cookies = request.cookies;
  const accessToken = cookies.get("access_token")?.value;
  const refreshToken = cookies.get("refresh_token")?.value;

  // No refresh token → nothing to rotate; let the layouts handle redirecting
  // to /login for protected pages.
  if (!refreshToken) {
    return NextResponse.next();
  }

  // Access token still valid → nothing to do.
  const expiration = getJwtExpiration(accessToken);
  if (expiration !== null && expiration > Date.now() / 1000) {
    return NextResponse.next();
  }

  // Access token missing or expired → try to rotate via the backend.
  const cookieHeader = cookies
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const refreshed = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader,
    },
    body: JSON.stringify({}),
  });

  const response = NextResponse.next();

  if (refreshed.ok) {
    // Forward the rotated httpOnly tokens from the backend to the browser.
    for (const setCookie of getSetCookieValues(refreshed.headers)) {
      response.headers.append("set-cookie", setCookie);
    }
    return response;
  }

  // Refresh failed → sign the browser out cleanly. Do not redirect here:
  // layouts and backend-authenticated pages own that decision, they just
  // need the dead cookies gone.
  response.cookies.set("access_token", "", { path: "/", maxAge: 0 });
  response.cookies.set("refresh_token", "", { path: "/", maxAge: 0 });
  return response;
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
  // browser API client; letting the middleware rotate there too would cause
  // double refresh-token rotation.
  matcher: [
    "/((?!api/v1/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
