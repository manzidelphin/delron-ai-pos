import type { SupabaseClient } from "@supabase/supabase-js";
import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

/**
 * Read-only lookups the DELRON assistant can call (Gemini function calling).
 * Every query is locked to the asker's business; staff who are not owner or
 * manager only see items, open tabs and their own sales.
 * Dates are Kigali calendar days (YYYY-MM-DD).
 */

export interface AIToolContext {
  admin: SupabaseClient;
  businessId: string;
  staffId: string;
  /** owner / manager: whole business. Others: limited (see FULL_ONLY). */
  fullAccess: boolean;
}

const MAX_ROWS = 60; // rows returned to the model per list

// ── Kigali dates ────────────────────────────────────────────────────────────
export function kigaliToday(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Africa/Kigali" });
}
export function kigaliNowText(d = new Date()): string {
  return d.toLocaleString("en-GB", { timeZone: "Africa/Kigali", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
function addDays(day: string, n: number): string {
  const t = new Date(`${day}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
/** [from, to] Kigali days → UTC instants [start, end). Defaults to today. */
export function dayRange(from?: unknown, to?: unknown) {
  const f = isDay(from) ? from : kigaliToday();
  let t = isDay(to) ? to : f;
  if (t < f) t = f;
  return { from: f, to: t, start: `${f}T00:00:00+02:00`, end: `${addDays(t, 1)}T00:00:00+02:00` };
}
const kigaliHour = (iso: string) => Number(new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Kigali", hour: "2-digit", hour12: false })) % 24;
const kigaliDayOf = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Kigali" });
const money = (n: number) => Math.round(n);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Pages through a query (Supabase returns at most 1000 rows per request). */
async function fetchAll<T>(make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, cap = 20000): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < cap; i += 1000) {
    const { data, error } = await make(i, i + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function staffNames(ctx: AIToolContext): Promise<Map<string, string>> {
  const { data } = await ctx.admin.from("staff").select("id, name").eq("business_id", ctx.businessId);
  return new Map((data ?? []).map((s) => [s.id as string, s.name as string]));
}

function top<T>(rows: T[], n = MAX_ROWS) {
  return rows.length > n ? { rows: rows.slice(0, n), more: rows.length - n } : { rows };
}

// ── Tools ───────────────────────────────────────────────────────────────────
type Args = Record<string, unknown>;

interface Tx { id: string; order_id: string | null; cashier_id: string | null; total: number; payment_method: string | null; module_source: string | null; created_at: string }

async function salesTransactions(ctx: AIToolContext, a: Args) {
  const r = dayRange(a.from, a.to);
  const area = str(a.area);
  let txs = await fetchAll<Tx>((f, t) => {
    let q = ctx.admin.from("transactions").select("id, order_id, cashier_id, total, payment_method, module_source, created_at")
      .eq("business_id", ctx.businessId).gte("created_at", r.start).lt("created_at", r.end).order("created_at").range(f, t);
    if (area) q = q.eq("module_source", area);
    if (!ctx.fullAccess) q = q.eq("cashier_id", ctx.staffId);
    return q;
  });
  const staff = str(a.staff_name).toLowerCase();
  let names: Map<string, string> | null = null;
  if (staff) {
    names = await staffNames(ctx);
    txs = txs.filter((t) => (names!.get(t.cashier_id ?? "") ?? "").toLowerCase().includes(staff));
  }
  return { r, txs, names };
}

async function getSales(ctx: AIToolContext, a: Args) {
  const { r, txs, names: known } = await salesTransactions(ctx, a);
  const groupBy = str(a.group_by) || "none";
  const total = txs.reduce((s, t) => s + Number(t.total || 0), 0);
  const base = {
    period: r.from === r.to ? r.from : `${r.from} to ${r.to}`,
    scope: ctx.fullAccess ? "whole business" : "only your own sales",
    total_revenue_rwf: money(total),
    number_of_sales: txs.length,
    average_sale_rwf: txs.length ? money(total / txs.length) : 0,
  };
  if (groupBy === "none") return base;

  if (groupBy === "product") {
    // Item detail lives on the order lines of each paid order.
    const orderIds = Array.from(new Set(txs.map((t) => t.order_id).filter(Boolean))) as string[];
    const lines: { item_name: string; item_type: string; quantity: number; total_price: number; notes: string | null }[] = [];
    for (let i = 0; i < orderIds.length; i += 150) {
      const { data, error } = await ctx.admin.from("order_items").select("item_name, item_type, quantity, total_price, notes").in("order_id", orderIds.slice(i, i + 150));
      if (error) throw new Error(error.message);
      lines.push(...(data ?? []));
    }
    const map = new Map<string, { item: string; area: string; quantity: number; revenue_rwf: number }>();
    for (const l of lines) {
      // Bar spirits: keep single / double / quarter / bottle apart.
      const serve = l.item_type === "bar_item" && l.notes && !/^\d+$/.test(l.notes) ? ` (${l.notes})` : "";
      const key = `${l.item_type}|${l.item_name}${serve}`;
      const g = map.get(key) ?? { item: `${l.item_name}${serve}`, area: l.item_type, quantity: 0, revenue_rwf: 0 };
      g.quantity += Number(l.quantity || 0);
      g.revenue_rwf += Number(l.total_price || 0);
      map.set(key, g);
    }
    const sortWorst = str(a.order) === "lowest";
    const rows = Array.from(map.values()).map((g) => ({ ...g, revenue_rwf: money(g.revenue_rwf) }))
      .sort((x, y) => (sortWorst ? x.revenue_rwf - y.revenue_rwf : y.revenue_rwf - x.revenue_rwf));
    return { ...base, by_product: top(rows, Number(a.limit) > 0 ? Math.min(Number(a.limit), MAX_ROWS) : MAX_ROWS) };
  }

  const names = groupBy === "staff" ? known ?? (await staffNames(ctx)) : null;
  const keyOf = (t: Tx): string => {
    switch (groupBy) {
      case "day": return kigaliDayOf(t.created_at);
      case "hour": return `${String(kigaliHour(t.created_at)).padStart(2, "0")}:00`;
      case "payment_method": return t.payment_method ?? "unknown";
      case "area": return t.module_source ?? "unknown";
      case "staff": return names!.get(t.cashier_id ?? "") ?? "unknown";
      case "weekday": return new Date(t.created_at).toLocaleDateString("en-GB", { timeZone: "Africa/Kigali", weekday: "long" });
      default: return "all";
    }
  };
  const groups = new Map<string, { revenue: number; sales: number }>();
  for (const t of txs) {
    const k = keyOf(t);
    const g = groups.get(k) ?? { revenue: 0, sales: 0 };
    g.revenue += Number(t.total || 0); g.sales += 1;
    groups.set(k, g);
  }
  const rows = Array.from(groups.entries()).map(([k, g]) => ({ [groupBy]: k, revenue_rwf: money(g.revenue), sales: g.sales }));
  if (groupBy === "day" || groupBy === "hour") rows.sort((x, y) => String(x[groupBy]).localeCompare(String(y[groupBy])));
  else rows.sort((x, y) => y.revenue_rwf - x.revenue_rwf);
  return { ...base, [`by_${groupBy}`]: top(rows) };
}

async function findItems(ctx: AIToolContext, a: Args) {
  const area = str(a.area) || "all";
  const q = str(a.search);
  const lowOnly = a.low_stock_only === true;
  const out: Record<string, unknown>[] = [];
  const want = (x: string) => area === "all" || area === x;
  const filt = <T extends { ilike: (c: string, p: string) => T }>(b: T) => (q ? b.ilike("name", `%${q}%`) : b);

  if (want("supermarket")) {
    const { data } = await filt(ctx.admin.from("products").select("name, category, price, cost_price, quantity, min_quantity, unit, barcode, expiry_date, is_active, stock_type").eq("business_id", ctx.businessId).eq("is_active", true)).limit(500);
    for (const p of data ?? []) out.push({ area: p.stock_type === "bar" ? "bar (product)" : "supermarket", name: p.name, category: p.category, price_rwf: p.price, cost_rwf: p.cost_price, in_stock: Number(p.quantity), min_level: Number(p.min_quantity), unit: p.unit, expiry: p.expiry_date ?? undefined });
  }
  if (want("bar")) {
    const { data } = await filt(ctx.admin.from("bar_items").select("name, category, price_per_bottle, price_per_shot, price_per_quarter, shots_per_bottle, quantity_bottles, shots_remaining, min_quantity").eq("business_id", ctx.businessId).eq("is_active", true)).limit(500);
    for (const b of data ?? []) out.push({ area: "bar", name: b.name, category: b.category, bottle_price_rwf: b.price_per_bottle, single_shot_price_rwf: b.price_per_shot || undefined, quarter_price_rwf: b.price_per_quarter || undefined, in_stock: Number(b.quantity_bottles), unit: "bottles", shots_left_in_open_bottle: b.shots_remaining || undefined, min_level: Number(b.min_quantity) });
  }
  if (want("bakery")) {
    const { data } = await filt(ctx.admin.from("finished_goods").select("name, category, selling_price, cost_price, quantity, unit").eq("business_id", ctx.businessId).eq("is_active", true)).limit(500);
    for (const g of data ?? []) out.push({ area: "bakery (finished goods)", name: g.name, category: g.category, price_rwf: g.selling_price, cost_rwf: g.cost_price, in_stock: Number(g.quantity), unit: g.unit });
  }
  if (want("ingredients")) {
    const { data } = await filt(ctx.admin.from("raw_materials").select("name, unit, quantity, min_quantity, cost_per_unit").eq("business_id", ctx.businessId)).limit(500);
    for (const m of data ?? []) out.push({ area: "ingredients", name: m.name, in_stock: Number(m.quantity), min_level: Number(m.min_quantity), unit: m.unit, cost_per_unit_rwf: m.cost_per_unit });
  }
  if (want("restaurant")) {
    const { data } = await filt(ctx.admin.from("menu_items").select("name, category, selling_price, cost_price").eq("business_id", ctx.businessId).eq("is_active", true)).limit(500);
    for (const m of data ?? []) out.push({ area: "restaurant menu", name: m.name, category: m.category, price_rwf: m.selling_price, cost_rwf: m.cost_price });
  }

  let rows = out;
  if (lowOnly) {
    rows = rows.filter((r) => typeof r.min_level === "number" && (r.min_level as number) > 0 && (r.in_stock as number) <= (r.min_level as number))
      .map((r) => ({ ...r, status: (r.in_stock as number) <= 0 ? "OUT OF STOCK" : "low" }));
  }
  rows.sort((x, y) => String(x.name).localeCompare(String(y.name)));
  return { count: rows.length, items: top(rows, 80) };
}

async function getCredits(ctx: AIToolContext, a: Args) {
  const status = str(a.status) || "unpaid";
  let q = ctx.admin.from("credits").select("customer_name, customer_phone, items_description, total_amount, amount_paid, balance, due_date, status, created_at, paid_at")
    .eq("business_id", ctx.businessId).order("balance", { ascending: false }).limit(300);
  if (status === "unpaid") q = q.neq("status", "paid");
  else if (status !== "all") q = q.eq("status", status);
  if (str(a.customer)) q = q.ilike("customer_name", `%${str(a.customer)}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const today = kigaliToday();
  const rows = (data ?? []).map((c) => ({
    customer: c.customer_name, phone: c.customer_phone, for: c.items_description ?? undefined,
    total_rwf: money(Number(c.total_amount)), paid_rwf: money(Number(c.amount_paid)), still_owed_rwf: money(Number(c.balance)),
    due: c.due_date, status: c.status, overdue: c.status !== "paid" && c.due_date && c.due_date < today ? true : undefined,
    given_on: kigaliDayOf(c.created_at),
  }));
  return { total_still_owed_rwf: money(rows.reduce((s, r) => s + r.still_owed_rwf, 0)), count: rows.length, credits: top(rows) };
}

async function getShifts(ctx: AIToolContext, a: Args) {
  const r = dayRange(a.from, a.to);
  let q = ctx.admin.from("shifts").select("staff_name, role, started_at, ended_at, opening_cash, closing_cash, expected_cash, cash_variance, total_sales, total_orders, status")
    .eq("business_id", ctx.businessId).gte("started_at", r.start).lt("started_at", r.end).order("started_at", { ascending: false }).limit(200);
  if (str(a.staff_name)) q = q.ilike("staff_name", `%${str(a.staff_name)}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Kigali", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : null);
  const rows = (data ?? []).map((s) => ({
    staff: s.staff_name, role: s.role, started: time(s.started_at), ended: time(s.ended_at) ?? "still open", status: s.status,
    sales_rwf: money(Number(s.total_sales || 0)), orders: s.total_orders,
    expected_cash_rwf: s.expected_cash == null ? undefined : money(Number(s.expected_cash)),
    counted_cash_rwf: s.closing_cash == null ? undefined : money(Number(s.closing_cash)),
    cash_difference_rwf: s.cash_variance == null ? undefined : money(Number(s.cash_variance)),
  }));
  return { period: `${r.from} to ${r.to}`, shifts: top(rows) };
}

async function getOpenTabs(ctx: AIToolContext) {
  const { data: orders, error } = await ctx.admin.from("orders").select("id, total, created_at, table_id, staff_id, notes")
    .eq("business_id", ctx.businessId).eq("status", "pending").order("created_at").limit(100);
  if (error) throw new Error(error.message);
  const ids = (orders ?? []).map((o) => o.id);
  const tableIds = Array.from(new Set((orders ?? []).map((o) => o.table_id).filter(Boolean)));
  const [{ data: items }, { data: tables }, names] = await Promise.all([
    ids.length ? ctx.admin.from("order_items").select("order_id, item_name, quantity, total_price, notes, item_type").in("order_id", ids) : Promise.resolve({ data: [] as { order_id: string; item_name: string; quantity: number; total_price: number; notes: string | null; item_type: string }[] }),
    tableIds.length ? ctx.admin.from("floor_tables").select("id, table_number").in("id", tableIds) : Promise.resolve({ data: [] as { id: string; table_number: string }[] }),
    staffNames(ctx),
  ]);
  const tableName = new Map((tables ?? []).map((t) => [t.id, t.table_number]));
  const rows = (orders ?? []).map((o) => ({
    table: o.table_id ? tableName.get(o.table_id) ?? "table" : "no table",
    opened: new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Africa/Kigali", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    served_by: names.get(o.staff_id ?? "") ?? undefined,
    total_rwf: money(Number(o.total || 0)),
    items: (items ?? []).filter((i) => i.order_id === o.id).map((i) => `${i.quantity} × ${i.item_name}${i.item_type === "bar_item" && i.notes && !/^\d+$/.test(i.notes) ? ` (${i.notes})` : ""}`),
  }));
  return { open_tabs: rows.length, total_open_rwf: money(rows.reduce((s, r) => s + r.total_rwf, 0)), tabs: top(rows) };
}

async function getRemovedItems(ctx: AIToolContext, a: Args) {
  const r = dayRange(a.from, a.to);
  const { data, error } = await ctx.admin.from("order_item_voids").select("table_label, item_name, serving, quantity, amount, reason, note, returned_to_stock, table_cancelled, staff_name, created_at")
    .eq("business_id", ctx.businessId).gte("created_at", r.start).lt("created_at", r.end).order("created_at", { ascending: false }).limit(300);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((v) => ({
    when: new Date(v.created_at).toLocaleString("en-GB", { timeZone: "Africa/Kigali", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    table: v.table_label, item: v.item_name, serving: v.serving, quantity: Number(v.quantity), amount_rwf: money(Number(v.amount)),
    reason: v.reason, note: v.note ?? undefined, back_in_stock: v.returned_to_stock, whole_table_cancelled: v.table_cancelled || undefined, removed_by: v.staff_name,
  }));
  return { period: `${r.from} to ${r.to}`, total_removed_rwf: money(rows.reduce((s, x) => s + x.amount_rwf, 0)), removed: top(rows) };
}

async function getBakery(ctx: AIToolContext, a: Args) {
  const r = dayRange(a.from, a.to);
  const [{ data: prod }, { data: waste }, { data: goods }] = await Promise.all([
    ctx.admin.from("production_logs").select("finished_good_id, quantity_produced, created_at").eq("business_id", ctx.businessId).gte("created_at", r.start).lt("created_at", r.end).limit(2000),
    ctx.admin.from("waste_logs").select("item_name, item_type, quantity_wasted, reason, cost_of_waste, created_at").eq("business_id", ctx.businessId).gte("created_at", r.start).lt("created_at", r.end).limit(1000),
    ctx.admin.from("finished_goods").select("id, name").eq("business_id", ctx.businessId),
  ]);
  const gname = new Map((goods ?? []).map((g) => [g.id, g.name]));
  const produced = new Map<string, number>();
  for (const p of prod ?? []) { const n = gname.get(p.finished_good_id) ?? "unknown"; produced.set(n, (produced.get(n) ?? 0) + Number(p.quantity_produced || 0)); }
  const wasted = new Map<string, { quantity: number; cost: number; reasons: Set<string> }>();
  for (const w of waste ?? []) {
    const g = wasted.get(w.item_name) ?? { quantity: 0, cost: 0, reasons: new Set<string>() };
    g.quantity += Number(w.quantity_wasted || 0); g.cost += Number(w.cost_of_waste || 0); if (w.reason) g.reasons.add(w.reason);
    wasted.set(w.item_name, g);
  }
  return {
    period: `${r.from} to ${r.to}`,
    produced: top(Array.from(produced.entries()).map(([item, quantity]) => ({ item, quantity })).sort((x, y) => y.quantity - x.quantity)),
    wasted: top(Array.from(wasted.entries()).map(([item, g]) => ({ item, quantity: g.quantity, cost_rwf: money(g.cost), reasons: Array.from(g.reasons).join(", ") || undefined })).sort((x, y) => y.cost_rwf - x.cost_rwf)),
  };
}

async function getStockCounts(ctx: AIToolContext, a: Args) {
  const r = dayRange(a.from, a.to);
  const { data, error } = await ctx.admin.from("daily_stock_counts").select("count_date, item_name, opening_quantity, sold_today, restocked_today, expected_quantity, actual_quantity, variance")
    .eq("business_id", ctx.businessId).gte("count_date", r.from).lte("count_date", r.to).order("count_date", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((c) => ({ day: c.count_date, item: c.item_name, opening: Number(c.opening_quantity), sold: Number(c.sold_today), restocked: Number(c.restocked_today), expected: Number(c.expected_quantity), counted: Number(c.actual_quantity), difference: Number(c.variance) }))
    .sort((x, y) => Math.abs(y.difference) - Math.abs(x.difference));
  return { period: `${r.from} to ${r.to}`, counts: top(rows), note: "difference = counted − expected; negative means stock is missing" };
}

async function getCustomOrders(ctx: AIToolContext, a: Args) {
  let q = ctx.admin.from("custom_orders").select("customer_name, customer_phone, description, due_date, total_price, deposit_paid, status, created_at")
    .eq("business_id", ctx.businessId).order("due_date").limit(200);
  if (str(a.status)) q = q.eq("status", str(a.status));
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { orders: top((data ?? []).map((o) => ({ customer: o.customer_name, phone: o.customer_phone, what: o.description, due: o.due_date, price_rwf: o.total_price, deposit_rwf: o.deposit_paid, still_to_pay_rwf: Number(o.total_price || 0) - Number(o.deposit_paid || 0), status: o.status }))) };
}

async function getStaff(ctx: AIToolContext) {
  const [{ data: staff }, { data: branches }] = await Promise.all([
    ctx.admin.from("staff").select("name, role, phone, email, is_active, branch_id, created_at").eq("business_id", ctx.businessId).order("name"),
    ctx.admin.from("branches").select("id, name").eq("business_id", ctx.businessId),
  ]);
  const bname = new Map((branches ?? []).map((b) => [b.id, b.name]));
  return { staff: (staff ?? []).map((s) => ({ name: s.name, role: s.role, active: s.is_active, branch: bname.get(s.branch_id) ?? undefined, phone: s.phone ?? undefined, email: s.email ?? undefined, joined: kigaliDayOf(s.created_at) })), branches: (branches ?? []).map((b) => b.name) };
}

// ── Declarations ────────────────────────────────────────────────────────────
const DATE = { type: SchemaType.STRING, description: "Kigali calendar day, YYYY-MM-DD" } as const;

export const AI_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "get_sales",
    description: "Revenue and number of paid sales for a date range, optionally grouped. Use group_by='product' for best or worst sellers and quantities sold, 'staff' for who sold most, 'day' for a trend, 'hour' for busy hours, 'weekday', 'payment_method' (cash, mtn_momo, card, credit) or 'area' (supermarket, bakery, bar, restaurant).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        from: DATE, to: DATE,
        group_by: { type: SchemaType.STRING, format: "enum", enum: ["none", "product", "staff", "day", "hour", "weekday", "payment_method", "area"] },
        area: { type: SchemaType.STRING, format: "enum", enum: ["supermarket", "bakery", "bar", "restaurant"], description: "Only sales from this area" },
        staff_name: { type: SchemaType.STRING, description: "Only sales by this staff member (part of the name is enough)" },
        order: { type: SchemaType.STRING, format: "enum", enum: ["highest", "lowest"], description: "For group_by=product: best sellers first (default) or worst first" },
        limit: { type: SchemaType.INTEGER, description: "For group_by=product: how many products to return" },
      },
    },
  },
  {
    name: "find_items",
    description: "Products and stock: prices, cost, quantity in stock and minimum level. Use for 'how many X do we have', 'price of X', 'what is low or out of stock', 'list all bar items'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: { type: SchemaType.STRING, description: "Part of the item name; leave empty to list everything" },
        area: { type: SchemaType.STRING, format: "enum", enum: ["all", "supermarket", "bar", "bakery", "ingredients", "restaurant"] },
        low_stock_only: { type: SchemaType.BOOLEAN, description: "Only items at or below their minimum level" },
      },
    },
  },
  {
    name: "get_credits",
    description: "Customers who bought on credit: how much they owe, due dates, overdue.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: { type: SchemaType.STRING, format: "enum", enum: ["unpaid", "overdue", "partial", "paid", "all"], description: "Default unpaid" },
        customer: { type: SchemaType.STRING, description: "Part of the customer's name" },
      },
    },
  },
  {
    name: "get_shifts",
    description: "Staff shifts: when they worked, their sales, expected vs counted cash and the cash difference (shortage or surplus).",
    parameters: { type: SchemaType.OBJECT, properties: { from: DATE, to: DATE, staff_name: { type: SchemaType.STRING } } },
  },
  { name: "get_open_tabs", description: "Bar and restaurant tables with an open (unpaid) bill right now, with their items and totals.", parameters: { type: SchemaType.OBJECT, properties: {} } },
  {
    name: "get_removed_items",
    description: "Items removed from bar or restaurant bills and cancelled tables, with the reason and who removed them.",
    parameters: { type: SchemaType.OBJECT, properties: { from: DATE, to: DATE } },
  },
  {
    name: "get_bakery_production",
    description: "Bakery goods produced and waste (quantity, cost, reasons) for a date range.",
    parameters: { type: SchemaType.OBJECT, properties: { from: DATE, to: DATE } },
  },
  {
    name: "get_stock_counts",
    description: "End-of-day bar stock counts: expected vs counted bottles and the difference (missing stock).",
    parameters: { type: SchemaType.OBJECT, properties: { from: DATE, to: DATE } },
  },
  {
    name: "get_custom_orders",
    description: "Special orders taken from customers (for example cakes), with due date, price, deposit and status.",
    parameters: { type: SchemaType.OBJECT, properties: { status: { type: SchemaType.STRING } } },
  },
  { name: "get_staff", description: "Staff list with roles, branches and whether they are active.", parameters: { type: SchemaType.OBJECT, properties: {} } },
];

/** Tools only owners and managers may use. */
const FULL_ONLY = new Set(["get_credits", "get_shifts", "get_removed_items", "get_stock_counts", "get_staff", "get_bakery_production", "get_custom_orders"]);

export function toolsFor(fullAccess: boolean): FunctionDeclaration[] {
  return fullAccess ? AI_TOOL_DECLARATIONS : AI_TOOL_DECLARATIONS.filter((t) => !FULL_ONLY.has(t.name));
}

export async function runAITool(ctx: AIToolContext, name: string, args: Args): Promise<Record<string, unknown>> {
  if (!ctx.fullAccess && FULL_ONLY.has(name)) return { error: "Only the owner or a manager can see this." };
  try {
    switch (name) {
      case "get_sales": return await getSales(ctx, args);
      case "find_items": return await findItems(ctx, args);
      case "get_credits": return await getCredits(ctx, args);
      case "get_shifts": return await getShifts(ctx, args);
      case "get_open_tabs": return await getOpenTabs(ctx);
      case "get_removed_items": return await getRemovedItems(ctx, args);
      case "get_bakery_production": return await getBakery(ctx, args);
      case "get_stock_counts": return await getStockCounts(ctx, args);
      case "get_custom_orders": return await getCustomOrders(ctx, args);
      case "get_staff": return await getStaff(ctx);
      default: return { error: `Unknown tool ${name}` };
    }
  } catch (e) {
    console.error(`[AI tool] ${name} failed:`, e);
    return { error: "This lookup failed. Tell the user the data could not be loaded right now." };
  }
}
