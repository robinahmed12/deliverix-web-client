export type ChatMessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

export interface SupportChatPayload {
  message: string;
  history?: ChatMessage[];
  orderId?: string;
}

export interface RetrievedPolicy {
  id: string;
  title: string;
  category: string;
  similarity?: number;
}

export interface CustomerContextSummary {
  customerName: string;
  activeOrdersCount: number;
  relevantOrderNumber: string | null;
}

export interface SupportChatResponse {
  answer: string;
  retrievedPolicies: RetrievedPolicy[];
  customerContextSummary: CustomerContextSummary;
  suggestedActions: string[];
}

export interface FAQItem {
  id: string;
  category: "tracking" | "cancellation" | "rescheduling" | "failure" | "pod" | "returns" | "general";
  title: string;
  content: string;
  keywords: string[];
}

export interface FAQListFilters {
  category?: string;
  search?: string;
}
