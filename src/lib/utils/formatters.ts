import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const DEFAULT_TZ =
  typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "UTC";

export function formatDateTime(
  iso: string | Date | null | undefined,
  options?: { tz?: string; format?: string },
): string {
  if (iso === null || iso === undefined) return "—";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "—";
  const tz = options?.tz ?? DEFAULT_TZ;
  const zoned = toZonedTime(date, tz);
  return format(zoned, options?.format ?? "MMM d, yyyy h:mm a");
}

export function formatDate(
  iso: string | Date | null | undefined,
  options?: { tz?: string },
): string {
  return formatDateTime(iso, { ...options, format: "MMM d, yyyy" });
}

export function formatTime(
  iso: string | Date | null | undefined,
  options?: { tz?: string },
): string {
  return formatDateTime(iso, { ...options, format: "h:mm a" });
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "USD",
): string {
  if (amount === null || amount === undefined) return "—";
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function formatBytes(bytes: number | null | undefined): string {
  if (
    bytes === null ||
    bytes === undefined ||
    typeof bytes !== "number" ||
    !Number.isFinite(bytes)
  ) {
    return "—";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 || value >= 10 ? 0 : 1)} ${units[index]}`;
}
