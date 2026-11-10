import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { forbidUnlessManagement } from "@/lib/role-guard";
import { buildRestaurantReport, type ReportLine, type ReportMenuItem, type ReportOrder } from "@/lib/restaurant-report";

/**
 * Restaurant (food) report for a date range.
 *
 * Source of truth: order_items with item_type = 'menu_item' on PAID orders
 * (orders.status = 'completed'), whatever the order type (bar tab, counter, credit).
 * Dates/hours are Kigali time. No row caps: everything in range is read in pages.
 * Calculations live in src/lib/restaurant-report.ts.
 */

const PAGE = 1000;
// Read every row of a query in pages (Supabase returns at most 1000 rows per call).
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const denied = forbidUnlessManagement(auth.role);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const kigaliToday = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kigali" });
  const [kY, kM] = kigaliToday.split("-");
  const from = searchParams.get("from") ?? `${kY}-${kM}-01`;
  const to = searchParams.get("to") ?? kigaliToday;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "from/to must be YYYY-MM-DD" }, { status: 400 });
  }
  const fromISO = new Date(`${from}T00:00:00+02:00`).toISOString();
  const toISO = new Date(`${to}T23:59:59.999+02:00`).toISOString();

  const supabase = createAdminClient();

  try {
    // Paid orders in range + the menu + tables, in parallel.
    const [orders, menuRes, tablesRes] = await Promise.all([
      fetchAll<ReportOrder>((a, b) =>
        supabase
          .from("orders")
          .select("id, waiter_id, table_id, created_at")
          .eq("business_id", auth.businessId)
          .eq("status", "completed")
          .gte("created_at", fromISO)
          .lte("created_at", toISO)
          .order("created_at")
          .range(a, b)
      ),
      supabase
        .from("menu_items")
        .select("id, name, category, selling_price, cost_price, is_active, menu_recipes(quantity_needed, raw_materials(cost_per_unit))")
        .eq("business_id", auth.businessId),
      supabase.from("floor_tables").select("id, table_number").eq("business_id", auth.businessId),
    ]);
    if (menuRes.error) throw new Error(menuRes.error.message);

    // Food lines of those orders (chunked by order id to keep URLs short).
    const lines = (await Promise.all(
      chunk(orders.map((o) => o.id), 150).map((ids) =>
        fetchAll<ReportLine>((a, b) =>
          supabase
            .from("order_items")
            .select("order_id, item_id, item_name, quantity, total_price")
            .in("order_id", ids)
            .eq("item_type", "menu_item")
            .range(a, b)
        )
      )
    )).flat();

    // Waiter names for the orders that had food.
    const foodOrderIds = new Set(lines.map((l) => l.order_id));
    const waiterIds = Array.from(new Set(orders.filter((o) => foodOrderIds.has(o.id) && o.waiter_id).map((o) => o.waiter_id as string)));
    const { data: staffRows } = waiterIds.length
      ? await supabase.from("staff").select("id, name").eq("business_id", auth.businessId).in("id", waiterIds)
      : { data: [] as Array<{ id: string; name: string }> };

    return NextResponse.json(buildRestaurantReport({
      from, to, orders, lines,
      menu: (menuRes.data ?? []) as ReportMenuItem[],
      staffName: new Map((staffRows ?? []).map((s) => [s.id, s.name])),
      tableNumber: new Map((tablesRes.data ?? []).map((t) => [t.id, t.table_number as number])),
    }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to build report" }, { status: 500 });
  }
}
