import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
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
export function listSupportFAQs(
  filters: FAQListFilters = {},
  opts?: ApiFetchOptions,
): Promise<FAQItem[]> {
  return apiFetch(`/support/faq${buildQuery(filters)}`, opts);
}
