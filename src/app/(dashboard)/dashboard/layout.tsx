import { requireManagementPage } from "@/lib/role-guard";

// Dashboard is for owners and managers only; other roles go to their own screen.
export default async function DashboardSectionLayout({ children }: { children: React.ReactNode }) {
  await requireManagementPage();
  return <>{children}</>;
}
