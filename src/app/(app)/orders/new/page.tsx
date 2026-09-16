import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { serverFetch } from "@/lib/api/server-client";
import { CreateOrderForm } from "@/features/orders/components/create-order-form";
import type { CustomerSummary, ZoneSummary, ServiceTypeSummary } from "@/features/orders/types";

export const metadata: Metadata = { title: "New Order" };

async function loadReferenceData() {
  const [zonesResult, serviceTypesResult] = await Promise.all([
    serverFetch<{ data: ZoneSummary[] }>("/zones"),
    serverFetch<{ data: ServiceTypeSummary[] }>("/service-types"),
  ]);
  return {
    zones: zonesResult.data,
    serviceTypes: serviceTypesResult.data,
  };
}

export default async function NewOrderPage() {
  let refData;
  try {
    refData = await loadReferenceData();
  } catch {
    notFound();
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Orders", href: "/orders" },
          { label: "New order" },
        ]}
      />
      <PageHeader
        title="Create order"
        description="Fill in the details to create a new delivery order."
      />
      <CreateOrderForm
        initialZones={refData.zones}
        initialServiceTypes={refData.serviceTypes}
      />
    </div>
  );
}