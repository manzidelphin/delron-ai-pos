import { requireManagementPage } from "@/lib/role-guard";

// Owners and managers only; other roles go to their own screen.
export default async function ManagementOnlyLayout({ children }: { children: React.ReactNode }) {
  await requireManagementPage();
  return <>{children}</>;
}
