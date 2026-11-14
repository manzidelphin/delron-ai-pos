import type { SupabaseClient } from "@supabase/supabase-js";

export type StockArea = "Supermarket" | "Bar" | "Kitchen & bakery ingredients";

export interface StockAlertItem {
  area: StockArea;
  name: string;
  left: number;
  min: number;
  unit: string;
  suggestedOrder: number;
}

const num = (v: unknown) => Number(v ?? 0) || 0;

/** Order enough to get back to twice the minimum (at least the minimum itself). */
export function suggestedOrder(left: number, min: number): number {
  return Math.max(min, Math.ceil(min * 2 - Math.max(0, left)));
}

/**
 * Splits items into out of stock (0 or less) and low (above 0, at or below the
 * minimum). Items without a minimum (0) are ignored unless they are empty and
 * were given a minimum: nobody wants alerts for things they don't track.
 */
export function classifyStock(rows: { area: StockArea; name: string; left: unknown; min: unknown; unit?: string | null }[]) {
  const out: StockAlertItem[] = [];
  const low: StockAlertItem[] = [];
  for (const r of rows) {
    const left = num(r.left);
    const min = num(r.min);
    if (min <= 0) continue;
    const item = { area: r.area, name: r.name, left, min, unit: r.unit || "", suggestedOrder: suggestedOrder(left, min) };
    if (left <= 0) out.push(item);
    else if (left <= min) low.push(item);
  }
  const byArea = (a: StockAlertItem, b: StockAlertItem) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name);
  return { out: out.sort(byArea), low: low.sort(byArea) };
}

/** Out-of-stock and low items for one business (active items only). */
export async function collectLowStock(admin: SupabaseClient, businessId: string) {
  const [{ data: products }, { data: bar }, { data: materials }] = await Promise.all([
    admin.from("products").select("name, quantity, min_quantity, unit").eq("business_id", businessId).eq("is_active", true),
    admin.from("bar_items").select("name, quantity_bottles, min_quantity").eq("business_id", businessId).eq("is_active", true),
    admin.from("raw_materials").select("name, quantity, min_quantity, unit").eq("business_id", businessId),
  ]);
  return classifyStock([
    ...(products ?? []).map((p) => ({ area: "Supermarket" as const, name: p.name, left: p.quantity, min: p.min_quantity, unit: p.unit })),
    ...(bar ?? []).map((b) => ({ area: "Bar" as const, name: b.name, left: b.quantity_bottles, min: b.min_quantity, unit: "bottles" })),
    ...(materials ?? []).map((m) => ({ area: "Kitchen & bakery ingredients" as const, name: m.name, left: m.quantity, min: m.min_quantity, unit: m.unit })),
  ]);
}

/** Owner and manager email addresses for a business (falls back to the business email). */
export async function stockAlertRecipients(admin: SupabaseClient, businessId: string): Promise<string[]> {
  const [{ data: staff }, { data: business }] = await Promise.all([
    admin.from("staff").select("email").eq("business_id", businessId).eq("is_active", true).in("role", ["owner", "manager"]),
    admin.from("businesses").select("email").eq("id", businessId).maybeSingle(),
  ]);
  const emails = new Set<string>();
  for (const s of staff ?? []) if (s.email && /@/.test(s.email)) emails.add(String(s.email).trim().toLowerCase());
  if (!emails.size && business?.email) emails.add(String(business.email).trim().toLowerCase());
  return Array.from(emails);
}

/** Today's date in Kigali (YYYY-MM-DD), for "once per day" alerts. */
export function kigaliDay(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Africa/Kigali" });
}

/**
 * After a sale: if this item just ran out, email the owner and managers once
 * per item per day (when low-stock emails are on). Never throws.
 */
export async function notifyIfRanOut(
  admin: SupabaseClient,
  opts: { businessId: string; itemType: "product" | "bar_item"; itemId: string; newQuantity: number | null; soldQuantity: number }
) {
  try {
    if (opts.newQuantity === null || opts.newQuantity > 0) return;
    if (opts.newQuantity + opts.soldQuantity <= 0) return; // was already empty before this sale

    const { data: biz } = await admin.from("businesses").select("name, low_stock_email").eq("id", opts.businessId).maybeSingle();
    if (!biz || biz.low_stock_email === false) return;

    // Once per item per day: the insert only succeeds the first time.
    const { error: dup } = await admin.from("stock_alert_log").insert({
      business_id: opts.businessId, item_type: opts.itemType, item_id: opts.itemId, alert_day: kigaliDay(),
    });
    if (dup) return;

    const table = opts.itemType === "bar_item" ? "bar_items" : "products";
    const { data: item } = await admin.from(table).select("name").eq("id", opts.itemId).eq("business_id", opts.businessId).maybeSingle();
    const to = await stockAlertRecipients(admin, opts.businessId);
    if (!item || !to.length) return;

    const { sendOutOfStockEmail } = await import("@/lib/email");
    await sendOutOfStockEmail({ to, businessName: biz.name, itemName: item.name, area: opts.itemType === "bar_item" ? "Bar" : "Supermarket" });
  } catch (e) {
    console.error("[low-stock] out-of-stock alert failed:", e);
  }
}
