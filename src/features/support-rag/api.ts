import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type { DataResponse } from "@/lib/api/types";
import type {
  FAQItem,
  FAQListFilters,
  SupportChatPayload,
  SupportChatResponse,
} from "./types";

function buildQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
}

/**
 * Send customer query to the Deliverix AI Support Concierge (RAG)
 */
export function sendSupportChatMessage(
  payload: SupportChatPayload,
  opts?: ApiFetchOptions,
): Promise<SupportChatResponse> {
  return apiFetch("/support/chat", {
    ...opts,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Retrieve public FAQ knowledge base
 */
export async function listSupportFAQs(
  filters: FAQListFilters = {},
  opts?: ApiFetchOptions,
): Promise<FAQItem[]> {
  const res = await apiFetch<DataResponse<FAQItem[]> | FAQItem[]>(`/support/faq${buildQuery(filters)}`, opts);
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as DataResponse<FAQItem[]>).data)) {
    return (res as DataResponse<FAQItem[]>).data;
  }
  return [];
}
