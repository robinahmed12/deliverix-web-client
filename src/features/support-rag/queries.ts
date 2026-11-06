import { useMutation, useQuery } from "@tanstack/react-query";
import { listSupportFAQs, sendSupportChatMessage } from "./api";
import type { FAQListFilters, SupportChatPayload, SupportChatResponse } from "./types";

export const supportKeys = {
  all: ["support"] as const,
  faqs: (filters: FAQListFilters) => [...supportKeys.all, "faqs", filters] as const,
};

export function useSupportFAQsQuery(filters: FAQListFilters = {}) {
  return useQuery({
    queryKey: supportKeys.faqs(filters),
    queryFn: () => listSupportFAQs(filters),
    staleTime: 60_000,
  });
}

export function useSupportChatMutation() {
  return useMutation<SupportChatResponse, Error, SupportChatPayload>({
    mutationFn: (payload: SupportChatPayload) => sendSupportChatMessage(payload),
  });
}
