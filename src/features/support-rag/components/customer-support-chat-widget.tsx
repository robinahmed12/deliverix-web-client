"use client";

import * as React from "react";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useSupportChatMutation } from "../queries";
import type { ChatMessage, SupportChatResponse } from "../types";

interface CustomerSupportChatWidgetProps {
  currentOrderId?: string;
}

function formatInline(str: string): React.ReactNode {
  // Strip stray backticks
  const withoutBackticks = str.replace(/`([^`]+)`/g, "$1").replace(/`+/g, "");

  // If there are any bold tokens (**bold**), render cleanly as bold without raw asterisks
  const parts = withoutBackticks.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part.replace(/\*/g, "")}</span>;
  });
}

function StructuredChatMessage({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  // Pre-clean content defensively: strip divider bars, table dividers, header hashes
  const cleaned = content
    .replace(/^[-=_]{3,}$/gm, "")
    .replace(/^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/gm, "")
    .replace(/^#{1,6}\s*(.+)$/gm, "$1:")
    .trim();

  const lines = cleaned.split("\n");

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        let text = line.trim();
        if (!text) {
          return <div key={idx} className="h-1" />;
        }

        // Table row fallback: | col1 | col2 |
        if (text.startsWith("|") && text.endsWith("|")) {
          const cells = text
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim().replace(/\*{1,3}/g, "").replace(/`+/g, ""))
            .filter(Boolean);
          if (cells.length > 0 && !/^(order|order id|status)$/i.test(cells[0]!)) {
            text = `- ${cells.join(" — ")}`;
          }
        }

        // Bullet item (- or •)
        if (text.startsWith("- ") || text.startsWith("• ") || text.startsWith("* ")) {
          const itemText = text.replace(/^[-•*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="text-primary font-bold select-none text-xs leading-5">•</span>
              <span className="flex-1">{formatInline(itemText)}</span>
            </div>
          );
        }

        // Section Header (ends with colon or starts with digit like "1. Title:")
        if (text.endsWith(":") || /^\d+\.\s+[^:]+:?$/.test(text)) {
          return (
            <div key={idx} className="font-semibold text-foreground pt-1.5 pb-0.5 text-[13px] tracking-tight">
              {formatInline(text)}
            </div>
          );
        }

        // Regular text line
        return <div key={idx}>{formatInline(text)}</div>;
      })}
    </div>
  );
}

export function CustomerSupportChatWidget({ currentOrderId }: CustomerSupportChatWidgetProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputMessage, setInputMessage] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I am your Deliverix AI Support Concierge. Ask me anything about your active deliveries, tracking, rescheduling, or delivery policies.",
    },
  ]);
  const [lastResponse, setLastResponse] = React.useState<SupportChatResponse | null>(null);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const chatMutation = useSupportChatMutation();

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMutation.isPending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputMessage).trim();
    if (!text || chatMutation.isPending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage("");

    try {
      const response = await chatMutation.mutateAsync({
        message: text,
        history: messages.slice(-8), // Send last 8 turns for context
        orderId: currentOrderId,
      });

      setLastResponse(response);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I am having trouble connecting to support right now. Please try again or email us at support@deliverix.local.",
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button
            size="lg"
            onClick={() => setIsOpen(true)}
            className="rounded-full shadow-xl size-14 p-0 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-transform hover:scale-105"
          >
            <MessageSquare className="size-6" />
            <span className="sr-only">Open Deliverix Support</span>
          </Button>
        )}
      </div>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-md sm:w-[420px] shadow-2xl rounded-2xl animate-in fade-in slide-in-from-bottom-6 duration-200">
          <Card className="border shadow-lg flex flex-col h-[560px] overflow-hidden rounded-2xl">
            {/* Header */}
            <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="size-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-white">
                    Deliverix AI Concierge
                    <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-none py-0">
                      Ask your query
                    </Badge>
                  </CardTitle>
                  <p className="text-[11px] text-white/80">Grounding from real-time order history</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="size-8 p-0 text-white hover:bg-white/20 rounded-full"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </CardHeader>

            {/* Conversation Messages */}
            <CardContent className="flex-1 p-0 overflow-hidden">
              <div className="h-full p-4 overflow-y-auto space-y-3 text-sm" ref={scrollRef}>
                {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="size-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-3.5 py-2.5 max-w-[82%] text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    }`}
                  >
                    <StructuredChatMessage content={msg.content} isUser={msg.role === "user"} />
                  </div>

                  {msg.role === "user" && (
                    <div className="size-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 mt-0.5">
                      <User className="size-4" />
                    </div>
                  )}
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex gap-2.5 justify-start items-center text-xs text-muted-foreground italic">
                  <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="size-4" />
                  </div>
                  <span>Checking live orders & policy documents...</span>
                </div>
              )}

              {/* Policy Grounding Tag */}
              {lastResponse?.retrievedPolicies && lastResponse.retrievedPolicies.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block mb-1">
                    Verified Policies (pgVector Grounded)
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {lastResponse.retrievedPolicies.map((p) => (
                      <Badge key={p.id} variant="outline" className="text-[10px] py-0">
                        {p.title}
                        {p.similarity ? ` (${Math.round(p.similarity * 100)}% match)` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </CardContent>

            {/* Suggested Quick Actions */}
            {lastResponse?.suggestedActions && lastResponse.suggestedActions.length > 0 && (
              <div className="px-4 py-2 border-t bg-muted/20 flex flex-wrap gap-1.5">
                {lastResponse.suggestedActions.map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 rounded-full px-2.5"
                    onClick={() => void handleSendMessage(action)}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            )}

            {/* Footer Input */}
            <CardFooter className="p-3 border-t flex gap-2 bg-background">
              <Input
                placeholder="Ask about status, cancellation, policies..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={chatMutation.isPending}
                className="text-xs h-9 focus-visible:ring-1"
              />
              <Button
                size="sm"
                onClick={() => void handleSendMessage()}
                disabled={!inputMessage.trim() || chatMutation.isPending}
                className="h-9 w-9 p-0 shrink-0"
              >
                <Send className="size-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
