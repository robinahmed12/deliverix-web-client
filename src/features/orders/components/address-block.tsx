import type { OrderAddress } from "../types";

function formatAddressLine(addr: OrderAddress): string {
  const parts = [addr.line1, addr.line2].filter(Boolean);
  return parts.join(", ");
}

function formatCityRegionPostal(addr: OrderAddress): string {
  const parts = [addr.city, addr.region, addr.postalCode].filter(Boolean);
  return parts.join(", ");
}

export function AddressBlock({
  address,
  label,
}: {
  address: OrderAddress;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="text-sm text-muted-foreground">
        <p>{formatAddressLine(address)}</p>
        <p>{formatCityRegionPostal(address)}</p>
        <p>{address.country}</p>
        {address.contactName && (
          <p className="mt-1">
            Contact: {address.contactName}
            {address.contactPhone ? ` (${address.contactPhone})` : ""}
          </p>
        )}
      </div>
    </div>
  );
}