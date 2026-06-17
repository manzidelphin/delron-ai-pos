import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("production_logs")
    .select(`
      *,
      finished_goods(name, barcode, barcode_type, selling_price, unit),
      staff(name)
    `)
    .eq("business_id", auth.businessId)
    .gte("production_time", todayStart.toISOString())
    .order("production_time", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totalProduced = (data ?? []).reduce((sum, l) => sum + l.quantity_produced, 0);

  return NextResponse.json({ logs: data ?? [], total_produced: totalProduced });
}
