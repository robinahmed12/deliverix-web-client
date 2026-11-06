import { Metadata } from "next";
import { CustomerProfileView } from "@/features/customers/components/customer-profile-view";

export const metadata: Metadata = {
  title: "Profile & Settings | Deliverix",
  description: "Manage your customer profile and linked orders.",
};

export default function CustomerProfilePage() {
  return <CustomerProfileView />;
}
