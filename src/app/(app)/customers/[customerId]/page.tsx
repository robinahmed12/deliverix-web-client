import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api/server-client";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerDetailView } from "@/features/customers/components/customer-detail-view";
import type { CustomerDetail } from "@/features/customers/types";

async function loadCustomer(id: string): Promise<CustomerDetail> {
  return serverFetch<CustomerDetail>(`/customers/${id}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ customerId: string }>;
}): Promise<Metadata> {
  const { customerId } = await params;
  return { title: `Customer ${customerId}` };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;

  let customer: CustomerDetail;
  try {
    customer = await loadCustomer(customerId);
  } catch {
    notFound();
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Customers", href: "/customers" },
          { label: customer.name },
        ]}
      />
      <PageHeader
        title={customer.name}
        description={`Status: ${customer.status === "active" ? "Active" : "Inactive"}`}
      />
      <CustomerDetailView customerId={customerId} initialData={customer} />
    </div>
  );
}