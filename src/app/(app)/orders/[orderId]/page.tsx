import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api/server-client";
import { PageHeader } from "@/components/shared/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { OrderDetailView } from "@/features/orders/components/order-detail-view";
import type {
  DeliveryProof,
  Order,
  OrderStatusHistoryEntry,
  OrderNote,
} from "@/features/orders/types";

async function loadOrder(id: string): Promise<{
  order: Order;
  history: OrderStatusHistoryEntry[];
  notes: OrderNote[];
  proofs: DeliveryProof[];
}> {
  const [order, historyRes, notesResult, proofsResult] = await Promise.all([
    serverFetch<Order>(`/orders/${id}`),
    serverFetch<{ data: OrderStatusHistoryEntry[] }>(`/orders/${id}/history`),
    serverFetch<{ data: OrderNote[] }>(`/orders/${id}/notes?pageSize=100`),
    serverFetch<{ data: DeliveryProof[] }>(`/orders/${id}/proofs?pageSize=100`),
  ]);
  return {
    order,
    history: historyRes.data,
    notes: notesResult.data,
    proofs: proofsResult.data,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderId: string }>;
}): Promise<Metadata> {
  const { orderId } = await params;
  return { title: `Order ${orderId}` };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  let data;
  try {
    data = await loadOrder(orderId);
  } catch {
    notFound();
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Orders", href: "/orders" },
          { label: data.order.orderNumber },
        ]}
      />
      <PageHeader
        title={`Order ${data.order.orderNumber}`}
        description={`Status: ${data.order.status}`}
      />
      <OrderDetailView
        initialOrder={data.order}
        initialHistory={data.history}
        initialNotes={data.notes}
        initialProofs={data.proofs}
      />
    </div>
  );
}