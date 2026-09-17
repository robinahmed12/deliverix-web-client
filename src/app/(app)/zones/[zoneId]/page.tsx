import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api/server-client";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { ZoneDetailView } from "@/features/zones/components/zone-detail-view";
import type { ZoneDetail } from "@/features/zones/types";

async function loadZone(id: string): Promise<ZoneDetail> {
  return serverFetch<ZoneDetail>(`/zones/${id}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zoneId: string }>;
}): Promise<Metadata> {
  const { zoneId } = await params;
  return { title: `Zone ${zoneId}` };
}

export default async function ZoneDetailPage({
  params,
}: {
  params: Promise<{ zoneId: string }>;
}) {
  const { zoneId } = await params;

  let zone: ZoneDetail;
  try {
    zone = await loadZone(zoneId);
  } catch {
    notFound();
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Zones", href: "/zones" },
          { label: zone.name },
        ]}
      />
      <PageHeader
        title={zone.name}
        description={`Code: ${zone.code} · ${zone.active ? "Active" : "Inactive"}`}
      />
      <ZoneDetailView zoneId={zoneId} initialData={zone} />
    </div>
  );
}