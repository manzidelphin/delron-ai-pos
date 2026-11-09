import { requireManagementPage } from "@/lib/role-guard";
import RestaurantDashboardPage from "./restaurant-overview";

// Overview shows revenue figures: owners and managers only.
export default async function Page() {
  await requireManagementPage();
  return <RestaurantDashboardPage />;
}
