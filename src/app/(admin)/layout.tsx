import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("is_platform_admin")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!staffRecord?.is_platform_admin) redirect("/dashboard");

  return <AdminShell>{children}</AdminShell>;
}
