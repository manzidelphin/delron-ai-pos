import { requireManagementPage } from "@/lib/role-guard";

// Reports are for owners and managers only; other roles go to their own screen.
export default async function ReportsSectionLayout({ children }: { children: React.ReactNode }) {
  await requireManagementPage();
  return <>{children}</>;
}
