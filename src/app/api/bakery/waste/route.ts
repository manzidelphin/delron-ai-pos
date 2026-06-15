import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const item_id = searchParams.get("item_id") || "";

  const supabase = createClient();

  let query = supabase
    .from("waste_logs")
    .select("*, staff(name)")
    .eq("business_id", auth.businessId)
    .order("date", { ascending: false });

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (item_id) query = query.eq("item_id", item_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const logs = data ?? [];
  const totalToday = logs
    .filter((l) => l.date === new Date().toISOString().split("T")[0])
    .reduce((sum, l) => sum + l.cost_of_waste, 0);
  const totalTodayQty = logs
    .filter((l) => l.date === new Date().toISOString().split("T")[0])
    .reduce((sum, l) => sum + l.quantity_wasted, 0);

  return NextResponse.json({ logs, total_today: totalToday, total_today_qty: totalTodayQty });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { item_id, item_name, quantity_wasted, reason, date, notes } = body;

  if (!item_id || !item_name || !quantity_wasted || !reason) {
    return NextResponse.json({ error: "item_id, item_name, quantity_wasted, and reason are required" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: fg } = await supabase
    .from("finished_goods")
    .select("cost_price, quantity")
    .eq("id", item_id)
    .single();

  const costOfWaste = fg ? (fg.cost_price || 0) * parseFloat(quantity_wasted) : 0;

  const { data: log, error } = await supabase
    .from("waste_logs")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      item_id,
      item_type: "finished_good",
      item_name,
      quantity_wasted: parseFloat(quantity_wasted),
      reason,
      cost_of_waste: costOfWaste,
      logged_by: auth.staffId,
      date: date || new Date().toISOString().split("T")[0],
      ...(notes ? {} : {}),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduct from finished_goods
  if (fg) {
    await supabase
      .from("finished_goods")
      .update({ quantity: Math.max(0, (fg.quantity || 0) - parseFloat(quantity_wasted)), updated_at: new Date().toISOString() })
      .eq("id", item_id);
  }

  return NextResponse.json({ log }, { status: 201 });
}
