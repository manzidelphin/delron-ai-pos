import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";
import { sendSMS } from "@/lib/sms";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter"); // active | overdue | ready | collected | cancelled

  const supabase = createAdminClient();

  let query = supabase
    .from("custom_orders")
    .select(`
      *,
      created_by_staff:staff!custom_orders_created_by_fkey(name),
      collected_by_staff:staff!custom_orders_collected_by_fkey(name)
    `)
    .eq("business_id", auth.businessId)
    .order("due_date", { ascending: true });

  const today = new Date().toISOString().split("T")[0];

  if (filter === "active") {
    query = query.in("status", ["ordered", "in_progress", "ready"]).gte("due_date", today);
  } else if (filter === "ready") {
    query = query.eq("status", "ready");
  } else if (filter === "overdue") {
    query = query.in("status", ["ordered", "in_progress", "ready"]).lt("due_date", today);
  } else if (filter === "collected") {
    query = query.eq("status", "collected").order("collected_at", { ascending: false });
  } else if (filter === "cancelled") {
    query = query.eq("status", "cancelled");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orders = (data ?? []).map((o) => ({
    ...o,
    balance_due: o.total_price - o.deposit_paid,
    created_by_name:   (o.created_by_staff as { name: string } | null)?.name ?? null,
    collected_by_name: (o.collected_by_staff as { name: string } | null)?.name ?? null,
  }));

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await req.json();
  const { customer_name, customer_phone, description, due_date, total_price, deposit_paid = 0, notes } = body;

  if (!customer_name?.trim()) return NextResponse.json({ error: "Customer name required" }, { status: 400 });
  if (!description?.trim())   return NextResponse.json({ error: "Description required" }, { status: 400 });
  if (!due_date)              return NextResponse.json({ error: "Due date required" }, { status: 400 });
  if (!total_price || total_price <= 0) return NextResponse.json({ error: "Total price must be > 0" }, { status: 400 });
  if (deposit_paid < 0 || deposit_paid > total_price) return NextResponse.json({ error: "Deposit cannot exceed total price" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("custom_orders")
    .insert({
      business_id:    auth.businessId,
      branch_id:      auth.branchId,
      customer_name:  customer_name.trim(),
      customer_phone: customer_phone?.trim() || null,
      description:    description.trim(),
      due_date,
      total_price,
      deposit_paid,
      status:         "ordered",
      created_by:     auth.staffId,
      notes:          notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // SMS confirmation to customer (non-fatal)
  if (customer_phone) {
    try {
      const dueFmt = new Date(due_date + "T00:00:00").toLocaleDateString("en-RW", { weekday: "short", day: "numeric", month: "short" });
      await sendSMS(
        customer_phone,
        `DELRON POS — Custom Order Confirmed!\nOrder: ${description}\nPickup: ${dueFmt}\nDeposit Paid: RWF ${deposit_paid.toLocaleString()}\nBalance Due: RWF ${(total_price - deposit_paid).toLocaleString()}`
      );
    } catch {
      // SMS failure is non-fatal
    }
  }

  return NextResponse.json({ order: { ...order, balance_due: order.total_price - order.deposit_paid } }, { status: 201 });
}
