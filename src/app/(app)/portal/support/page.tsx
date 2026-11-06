import { Metadata } from "next";
import { CustomerSupportView } from "@/features/support-rag/components/customer-support-view";

export const metadata: Metadata = {
  title: "Support & Knowledge Center | Deliverix",
  description: "Explore delivery policies, FAQs, and 24/7 AI customer support.",
};

export default function CustomerSupportPage() {
  return <CustomerSupportView />;
}
