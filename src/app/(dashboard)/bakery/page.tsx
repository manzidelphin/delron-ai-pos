import { requireManagementPage } from "@/lib/role-guard";
import BakeryDashboard from "./bakery-overview";

// Overview shows revenue figures: owners and managers only.
export default async function Page() {
  await requireManagementPage();
  return <BakeryDashboard />;
}
