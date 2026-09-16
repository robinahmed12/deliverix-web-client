/**
 * Safe post-login redirect target validation (AUTH-008, AUTH-009).
 * Only same-origin relative paths are allowed; everything else falls back
 * to the default destination.
 */
export function safeRedirectTarget(
  next: unknown,
  fallback = "/dashboard",
): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  if (next.startsWith("/api/v1")) return fallback;

  return next;
}