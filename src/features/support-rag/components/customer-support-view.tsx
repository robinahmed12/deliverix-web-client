"use client";

import * as React from "react";
import {
  HelpCircle,
  Search,
  Mail,
} from "lucide-react";
import { useSupportFAQsQuery } from "../queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerSupportChatWidget } from "./customer-support-chat-widget";

export function CustomerSupportView() {
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");

  const { data: faqsData, isLoading } = useSupportFAQsQuery({
    category: activeCategory !== "all" ? activeCategory : undefined,
    search: search ? search : undefined,
  });

  const faqs = React.useMemo(() => {
    if (Array.isArray(faqsData)) return faqsData;
    if (faqsData && typeof faqsData === "object" && "data" in (faqsData as Record<string, unknown>)) {
      const d = (faqsData as { data: unknown }).data;
      if (Array.isArray(d)) return d;
    }
    return [];
  }, [faqsData]);

  return (
    <div className="space-y-8 w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Support & Knowledge Center</h1>
        <p className="text-muted-foreground mt-1">
          Explore Deliverix policies, find answers to frequently asked questions, or chat with our 24/7 AI Concierge.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input
          placeholder="Search policies (e.g. cancel, reschedule, proof, maximum attempts)..."
          className="pl-9 h-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-muted/60 rounded-lg w-full">
        {[
          { id: "all", label: "All Topics" },
          { id: "tracking", label: "Tracking" },
          { id: "cancellation", label: "Cancellation" },
          { id: "rescheduling", label: "Rescheduling" },
          { id: "failure", label: "Delivery Attempts" },
          { id: "pod", label: "Proof of Delivery" },
          { id: "returns", label: "Returns" },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeCategory === cat.id
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FAQ Items */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !faqs || faqs.length === 0 ? (
        <Card className="p-12 text-center">
          <HelpCircle className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="font-semibold text-lg">No matching topics</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search term or click the chat bubble below to ask our AI Concierge.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs uppercase tracking-wider text-primary">
                    {faq.category}
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold mt-1.5">{faq.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {faq.content}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contact Support Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
          <div className="flex items-center gap-3">
            <Mail className="size-8 text-primary shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground">Need Direct Human Assistance?</h4>
              <p className="text-sm text-muted-foreground">
                Our support team is available 7 days a week at support.deliverix@yopmail.com
              </p>
            </div>
          </div>
          <Badge className="bg-primary text-primary-foreground py-1 px-3">2-Hour Response SLA</Badge>
        </CardContent>
      </Card>

      {/* Floating AI Chat Widget */}
      <CustomerSupportChatWidget />
    </div>
  );
}
