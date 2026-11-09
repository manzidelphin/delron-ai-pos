import { requireManagementPage } from "@/lib/role-guard";
import BarDashboardPage from "./bar-overview";

// Overview shows revenue figures: owners and managers only.
export default async function Page() {
  await requireManagementPage();
  return <BarDashboardPage />;
}
