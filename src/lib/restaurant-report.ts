/**
 * Pure calculations for the Restaurant report (no database access), so they can be
 * tested with sample data. /api/reports/restaurant reads the rows and calls this.
 */

const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000;
const kigaliDate = (iso: string) => new Date(new Date(iso).getTime() + KIGALI_OFFSET_MS).toISOString().slice(0, 10);
const kigaliHour = (iso: string) => new Date(new Date(iso).getTime() + KIGALI_OFFSET_MS).getUTCHours();
const round = (n: number) => Math.round(n);
const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

export type ReportOrder = { id: string; waiter_id: string | null; table_id: string | null; created_at: string };
export type ReportLine = { order_id: string; item_id: string | null; item_name: string | null; quantity: number | string; total_price: number | string };
type Recipe = { quantity_needed: number | string | null; raw_materials: { cost_per_unit: number | string | null } | { cost_per_unit: number | string | null }[] | null };
export type ReportMenuItem = { id: string; name: string; category: string | null; selling_price: number | string | null; cost_price: number | string | null; is_active: boolean | null; menu_recipes: Recipe[] | null };

/** Cost of one portion: the dish's cost price if set, otherwise its recipe's ingredient cost; null if neither. */
export function dishUnitCost(m: ReportMenuItem): number | null {
  const direct = Number(m.cost_price ?? 0);
  if (direct > 0) return direct;
  const recipe = (m.menu_recipes ?? []).reduce((s, r) => {
    const mat = Array.isArray(r.raw_materials) ? r.raw_materials[0] : r.raw_materials;
    return s + Number(r.quantity_needed ?? 0) * Number(mat?.cost_per_unit ?? 0);
  }, 0);
  return recipe > 0 ? recipe : null;
}

export function buildRestaurantReport(input: {
  from: string; to: string;
  orders: ReportOrder[]; lines: ReportLine[]; menu: ReportMenuItem[];
  staffName: Map<string, string>; tableNumber: Map<string, number>;
}) {
  const { from, to, orders, lines, menu, staffName, tableNumber } = input;
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const menuById = new Map(menu.map((m) => [m.id, m]));
  const unitCost = new Map(menu.map((m) => [m.id, dishUnitCost(m)]));

  type DishAgg = { name: string; category: string; qty: number; revenue: number; cost: number | null };
  const dishes = new Map<string, DishAgg>();
  const daily = new Map<string, number>();
  const hourly = new Array(24).fill(0) as number[];
  const byCategory = new Map<string, number>();
  const foodOrderIds = new Set<string>();
  const waiterAgg = new Map<string, { orders: Set<string>; dishes: number; revenue: number }>();
  const tableAgg = new Map<string, { orders: Set<string>; revenue: number }>();

  for (const l of lines) {
    const order = orderById.get(l.order_id);
    if (!order) continue; // not a paid order in range
    const qty = Number(l.quantity ?? 0);
    const revenue = Number(l.total_price ?? 0);
    const item = l.item_id ? menuById.get(l.item_id) : undefined;
    const key = l.item_id ?? `name:${l.item_name}`;
    const category = item?.category || "Uncategorised";
    const uc = l.item_id ? unitCost.get(l.item_id) ?? null : null;

    const d = dishes.get(key) ?? { name: item?.name ?? l.item_name ?? "Unknown dish", category, qty: 0, revenue: 0, cost: uc === null ? null : 0 };
    d.qty += qty;
    d.revenue += revenue;
    if (d.cost !== null && uc !== null) d.cost += qty * uc;
    dishes.set(key, d);

    const day = kigaliDate(order.created_at);
    daily.set(day, (daily.get(day) ?? 0) + revenue);
    hourly[kigaliHour(order.created_at)] += revenue;
    byCategory.set(category, (byCategory.get(category) ?? 0) + revenue);
    foodOrderIds.add(order.id);

    const wKey = order.waiter_id ?? "unassigned";
    const w = waiterAgg.get(wKey) ?? { orders: new Set<string>(), dishes: 0, revenue: 0 };
    w.orders.add(order.id); w.dishes += qty; w.revenue += revenue;
    waiterAgg.set(wKey, w);

    if (order.table_id) {
      const t = tableAgg.get(order.table_id) ?? { orders: new Set<string>(), revenue: 0 };
      t.orders.add(order.id); t.revenue += revenue;
      tableAgg.set(order.table_id, t);
    }
  }

  const dishRows = Array.from(dishes.values())
    .map((d) => ({
      name: d.name, category: d.category, qty: round2(d.qty), revenue: round(d.revenue),
      cost: d.cost === null ? null : round(d.cost),
      profit: d.cost === null ? null : round(d.revenue - d.cost),
      margin_pct: d.cost === null ? null : pct(d.revenue - d.cost, d.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const foodRevenue = dishRows.reduce((s, d) => s + d.revenue, 0);
  const costed = dishRows.filter((d) => d.cost !== null);
  const costedRevenue = costed.reduce((s, d) => s + d.revenue, 0);
  const foodCost = costed.reduce((s, d) => s + (d.cost ?? 0), 0);
  const dishesSold = dishRows.reduce((s, d) => s + d.qty, 0);
  const peak = hourly.reduce((best, v, h) => (v > hourly[best] ? h : best), 0);

  // Daily series: empty days filled in for ranges up to ~3 months.
  const dailyRows: { date: string; revenue: number }[] = [];
  const start = new Date(`${from}T00:00:00Z`), end = new Date(`${to}T00:00:00Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days > 0 && days <= 93) {
    for (let i = 0; i < days; i++) {
      const day = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      dailyRows.push({ date: day, revenue: round(daily.get(day) ?? 0) });
    }
  } else {
    for (const [date, revenue] of Array.from(daily.entries()).sort(([a], [b]) => a.localeCompare(b))) dailyRows.push({ date, revenue: round(revenue) });
  }

  const soldIds = new Set(lines.filter((l) => orderById.has(l.order_id)).map((l) => l.item_id).filter(Boolean));
  const notSold = menu
    .filter((m) => m.is_active !== false && !soldIds.has(m.id))
    .map((m) => ({ name: m.name, category: m.category || "Uncategorised", price: round(Number(m.selling_price ?? 0)) }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  return {
    period: { from, to },
    kpis: {
      food_revenue: foodRevenue,
      dishes_sold: round2(dishesSold),
      food_orders: foodOrderIds.size,
      avg_food_per_order: foodOrderIds.size ? round(foodRevenue / foodOrderIds.size) : 0,
      food_cost: foodCost,
      gross_profit: costedRevenue - foodCost,
      margin_pct: pct(costedRevenue - foodCost, costedRevenue),
      dishes_without_cost: dishRows.filter((d) => d.cost === null).length,
      peak_hour: foodRevenue > 0 ? `${String(peak).padStart(2, "0")}:00` : "—",
    },
    daily_revenue: dailyRows,
    hourly: hourly.map((v, h) => ({ hour: `${String(h).padStart(2, "0")}:00`, revenue: round(v) })),
    by_category: Array.from(byCategory.entries()).map(([name, value]) => ({ name, value: round(value) })).sort((a, b) => b.value - a.value),
    dishes: dishRows,
    not_sold: notSold,
    waiters: Array.from(waiterAgg.entries())
      .map(([id, w]) => ({ name: id === "unassigned" ? "No waiter assigned" : staffName.get(id) ?? "Unknown", orders: w.orders.size, dishes: round2(w.dishes), revenue: round(w.revenue) }))
      .sort((a, b) => b.revenue - a.revenue),
    tables: Array.from(tableAgg.entries())
      .map(([id, t]) => ({ table_number: tableNumber.get(id) ?? 0, orders: t.orders.size, revenue: round(t.revenue), avg_spend: round(t.revenue / t.orders.size) }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}
