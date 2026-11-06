import { Metadata } from "next";
import { CustomerOrderTracker } from "@/features/customers/components/customer-order-tracker";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderId } = await params;
  return {
    title: `Order #${orderId} | Deliverix Tracking`,
    description: "Real-time delivery order progress and tracking timeline.",
  };
}

export default async function CustomerOrderDetailPage({ params }: PageProps) {
  const { orderId } = await params;
  return <CustomerOrderTracker orderId={orderId} />;
}
