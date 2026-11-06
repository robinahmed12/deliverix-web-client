import { Metadata } from "next";
import { CustomerAddressesView } from "@/features/customers/components/customer-addresses-view";

export const metadata: Metadata = {
  title: "Saved Addresses | Deliverix",
  description: "Manage your saved delivery destinations and default address.",
};

export default function CustomerAddressesPage() {
  return <CustomerAddressesView />;
}
