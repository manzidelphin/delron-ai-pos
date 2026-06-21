import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProductSoldRow {
  item_id: string;
  item_name: string;
  item_type: string;
  module: string;
  opening_stock: number | null;
  qty_sold: number;
  closing_stock: number | null;
  revenue: number;
  sold_by: string;
}

export interface StaffBreakdownRow {
  staff_id: string;
  staff_name: string;
  role: string;
  transactions: number;
  total_revenue: number;
  items_sold: number;
}

export interface DailyReportData {
  date: string;
  as_of: string;
  kpis: {
    total_revenue: number;
    total_items_sold: number;
    total_transactions: number;
    shifts_today: number;
  };
  products_sold: ProductSoldRow[];
  staff_breakdown: StaffBreakdownRow[];
}

function itemTypeToModule(itemType: string): string {
  switch (itemType) {
    case "product":       return "supermarket";
    case "finished_good": return "bakery";
    case "bar_item":      return "bar";
    default:              return "restaurant";
  }
}

export async function buildDailyReportData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  businessId: string,
  date: string
): Promise<DailyReportData> {
  const dayStart = date + "T00:00:00.000Z";
  const dayEnd   = date + "T23:59:59.999Z";

  // 1. Completed orders for the date
  const { data: ordersRaw } = await supabase
    .from("orders")
    .select("id, staff_id")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .limit(2000);

  const orders: { id: string; staff_id: string }[] = ordersRaw ?? [];
  const orderIds = orders.map((o) => o.id);
  const orderStaffMap: Record<string, string> = {};
  for (const o of orders) if (o.staff_id) orderStaffMap[o.id] = o.staff_id;

  // 2. Order items
  let orderItems: {
    item_id: string; item_name: string; item_type: string;
    quantity: number; total_price: number; order_id: string;
  }[] = [];
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from("order_items")
      .select("item_id, item_name, item_type, quantity, total_price, order_id")
      .in("order_id", orderIds.slice(0, 500));
    orderItems = data ?? [];
  }

  // 3. Transactions for the date
  const { data: txRaw } = await supabase
    .from("transactions")
    .select("cashier_id, total")
    .eq("business_id", businessId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);
  const transactions: { cashier_id: string | null; total: number }[] = txRaw ?? [];

  // 4. Shifts started on this date
  const { count: shiftsCount } = await supabase
    .from("shifts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("started_at", dayStart)
    .lte("started_at", dayEnd);

  // 5. Collect and fetch staff names
  const staffIdSet = new Set<string>();
  for (const tx of transactions) { if (tx.cashier_id) staffIdSet.add(tx.cashier_id); }
  for (const o of orders)        { if (o.staff_id)    staffIdSet.add(o.staff_id); }
  const staffIds = Array.from(staffIdSet);

  const staffMap: Record<string, { name: string; role: string }> = {};
  if (staffIds.length > 0) {
    const { data: staffData } = await supabase
      .from("staff")
      .select("id, name, role")
      .in("id", staffIds);
    for (const s of (staffData ?? [])) staffMap[s.id] = { name: s.name, role: s.role };
  }

  // 6. Aggregate order items by product
  const productAgg: Record<string, {
    item_id: string; item_name: string; item_type: string;
    qty_sold: number; revenue: number;
    staffRevenue: Record<string, number>;
  }> = {};

  for (const item of orderItems) {
    const iid   = item.item_id ?? "";
    const itype = item.item_type ?? "product";
    const key   = itype + "::" + (iid || item.item_name);
    if (!productAgg[key]) {
      productAgg[key] = { item_id: iid, item_name: item.item_name, item_type: itype, qty_sold: 0, revenue: 0, staffRevenue: {} };
    }
    productAgg[key].qty_sold += item.quantity ?? 0;
    productAgg[key].revenue  += item.total_price ?? 0;
    const staffId = orderStaffMap[item.order_id];
    if (staffId) {
      productAgg[key].staffRevenue[staffId] = (productAgg[key].staffRevenue[staffId] ?? 0) + (item.total_price ?? 0);
    }
  }

  // 7. Fetch current stock per product type
  const productIds = Object.values(productAgg).filter((p) => p.item_type === "product"       && p.item_id).map((p) => p.item_id);
  const fgIds      = Object.values(productAgg).filter((p) => p.item_type === "finished_good" && p.item_id).map((p) => p.item_id);
  const barIds     = Object.values(productAgg).filter((p) => p.item_type === "bar_item"      && p.item_id).map((p) => p.item_id);
  const stockMap: Record<string, number> = {};

  await Promise.all([
    productIds.length > 0
      ? supabase.from("products").select("id, quantity").in("id", productIds)
          .then(({ data }: { data: { id: string; quantity: number }[] | null }) => {
            for (const p of data ?? []) stockMap["product::" + p.id] = p.quantity;
          })
      : null,
    fgIds.length > 0
      ? supabase.from("finished_goods").select("id, quantity").in("id", fgIds)
          .then(({ data }: { data: { id: string; quantity: number }[] | null }) => {
            for (const p of data ?? []) stockMap["finished_good::" + p.id] = p.quantity;
          })
      : null,
    barIds.length > 0
      ? supabase.from("bar_items").select("id, quantity_bottles").in("id", barIds)
          .then(({ data }: { data: { id: string; quantity_bottles: number }[] | null }) => {
            for (const p of data ?? []) stockMap["bar_item::" + p.id] = p.quantity_bottles;
          })
      : null,
  ]);

  // 8. Build products_sold rows
  const products_sold: ProductSoldRow[] = Object.values(productAgg)
    .map((p) => {
      const closing = p.item_id ? (stockMap[p.item_type + "::" + p.item_id] ?? null) : null;
      const opening = closing !== null ? closing + p.qty_sold : null;
      const entries = Object.entries(p.staffRevenue).sort(([, a], [, b]) => b - a);
      const topId   = entries[0]?.[0];
      const extra   = entries.length - 1;
      const soldBy  = topId
        ? extra > 0
          ? (staffMap[topId]?.name ?? "Unknown") + " +" + extra
          : (staffMap[topId]?.name ?? "Unknown")
        : "—";
      return {
        item_id:       p.item_id,
        item_name:     p.item_name,
        item_type:     p.item_type,
        module:        itemTypeToModule(p.item_type),
        opening_stock: opening,
        qty_sold:      p.qty_sold,
        closing_stock: closing,
        revenue:       p.revenue,
        sold_by:       soldBy,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // 9. Staff breakdown from transactions
  const staffTxAgg: Record<string, { total: number; count: number }> = {};
  for (const tx of transactions) {
    const sid = tx.cashier_id ?? "__anon";
    if (!staffTxAgg[sid]) staffTxAgg[sid] = { total: 0, count: 0 };
    staffTxAgg[sid].total += tx.total ?? 0;
    staffTxAgg[sid].count++;
  }
  const staffItemsAgg: Record<string, number> = {};
  for (const item of orderItems) {
    const sid = orderStaffMap[item.order_id];
    if (sid) staffItemsAgg[sid] = (staffItemsAgg[sid] ?? 0) + (item.quantity ?? 0);
  }

  const staff_breakdown: StaffBreakdownRow[] = Object.entries(staffTxAgg)
    .map(([sid, agg]) => ({
      staff_id:      sid,
      staff_name:    staffMap[sid]?.name ?? (sid === "__anon" ? "—" : "Unknown"),
      role:          staffMap[sid]?.role ?? "—",
      transactions:  agg.count,
      total_revenue: agg.total,
      items_sold:    staffItemsAgg[sid] ?? 0,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue);

  return {
    date,
    as_of: new Date().toISOString(),
    kpis: {
      total_revenue:      transactions.reduce((s, t) => s + (t.total ?? 0), 0),
      total_items_sold:   orderItems.reduce((s, i) => s + (i.quantity ?? 0), 0),
      total_transactions: transactions.length,
      shifts_today:       shiftsCount ?? 0,
    },
    products_sold,
    staff_breakdown,
  };
}
