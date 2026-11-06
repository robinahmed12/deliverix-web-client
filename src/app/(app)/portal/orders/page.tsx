import { Metadata } from "next";
import { CustomerOrdersView } from "@/features/customers/components/customer-orders-view";

export const metadata: Metadata = {
  title: "My Deliveries | Deliverix",
  description: "View and track all your delivery orders.",
};

export default function CustomerOrdersPage() {
  return <CustomerOrdersView />;
}
