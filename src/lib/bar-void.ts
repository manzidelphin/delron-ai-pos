import type { SupabaseClient } from "@supabase/supabase-js";
import { serveFromNotes, isShotItem } from "@/lib/bar";

/** Reasons staff can choose when removing items or cancelling a table. */
export const VOID_REASONS = [
  "Not opened / returned",
  "Ordered by mistake",
  "Customer left",
  "Other",
] as const;

export interface VoidRow {
  id: string;
  item_id: string | null;
  item_type: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  created_at: string;
}

export interface VoidPortion {
  row: VoidRow;
  quantity: number;
  serving: string;          // bottle | single | double | quarter | food
  returnedToStock: boolean; // only unopened bottles go back on the shelf
}

/**
 * Which rows give up how much, newest first, to remove `quantity` from a bill
 * line (a line can be several rows added at different times). Pure, for tests.
 * Poured drinks and food can't be resold, so only whole bottles go back to stock.
 */
export function planVoid(rows: VoidRow[], quantity: number): VoidPortion[] {
  let remaining = quantity;
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const out: VoidPortion[] = [];
  for (const row of sorted) {
    if (remaining <= 0) break;
    const q = Math.min(Number(row.quantity), remaining);
    if (q <= 0) continue;
    const serving = row.item_type === "bar_item" ? serveFromNotes(row.notes) : "food";
    out.push({ row, quantity: q, serving, returnedToStock: row.item_type === "bar_item" && serving === "bottle" });
    remaining -= q;
  }
  return out;
}

type Who = { businessId: string; branchId: string; staffId: string };

/**
 * Removes items from an open bar/restaurant bill (or cancels the whole table):
 * updates the bill, returns unopened bottles to stock, and logs every removal
 * with who, why and its value. Returns the new bill total.
 */
export async function voidTabItems(
  admin: SupabaseClient,
  who: Who,
  orderId: string,
  opts: { lineIds?: string[]; quantity?: number; reason: string; note?: string | null; cancelTable?: boolean }
): Promise<{ ok: true; total: number; removed: number } | { ok: false; status: number; error: string }> {
  const reason = String(opts.reason ?? "").trim();
  if (!reason) return { ok: false, status: 400, error: "Choose a reason" };
  if (reason === "Other" && !String(opts.note ?? "").trim()) return { ok: false, status: 400, error: "Write the reason" };

  const { data: order } = await admin
    .from("orders")
    .select("id, status, table_id, floor_tables(table_number, section)")
    .eq("id", orderId).eq("business_id", who.businessId).maybeSingle();
  if (!order) return { ok: false, status: 404, error: "Bill not found" };
  if (["completed", "cancelled"].includes(order.status)) return { ok: false, status: 400, error: "This bill is already closed" };

  let query = admin.from("order_items")
    .select("id, item_id, item_type, item_name, quantity, unit_price, notes, created_at")
    .eq("order_id", orderId);
  if (!opts.cancelTable) {
    if (!opts.lineIds?.length) return { ok: false, status: 400, error: "Choose what to remove" };
    query = query.in("id", opts.lineIds);
  }
  const { data: rows } = await query;
  const list = (rows ?? []) as VoidRow[];
  if (!opts.cancelTable && !list.length) return { ok: false, status: 404, error: "Item not found on this bill" };

  const lineQty = list.reduce((s, r) => s + Number(r.quantity), 0);
  const qty = opts.cancelTable ? lineQty : Number(opts.quantity);
  if (!opts.cancelTable && (!Number.isFinite(qty) || qty <= 0 || qty > lineQty + 1e-9)) {
    return { ok: false, status: 400, error: `You can remove between 1 and ${lineQty}` };
  }

  // Group rows by drink so a cancelled table can contain several lines.
  const portions = opts.cancelTable
    ? list.map((row) => planVoid([row], Number(row.quantity))[0]).filter(Boolean)
    : planVoid(list, qty);

  const { data: staff } = await admin.from("staff").select("name").eq("id", who.staffId).maybeSingle();
  const ft = (Array.isArray(order.floor_tables) ? order.floor_tables[0] : order.floor_tables) as { table_number?: string; section?: string | null } | null;
  const tableLabel = ft ? `T${ft.table_number}${ft.section ? ` ${ft.section}` : ""}` : null;

  // Bar items' shot settings, to return a whole bottle's shots with it.
  const barIds = Array.from(new Set(portions.filter((p) => p.returnedToStock && p.row.item_id).map((p) => p.row.item_id as string)));
  const { data: barItems } = barIds.length
    ? await admin.from("bar_items").select("id, shots_per_bottle, price_per_shot").eq("business_id", who.businessId).in("id", barIds)
    : { data: [] as { id: string; shots_per_bottle: number | null; price_per_shot: number | null }[] };
  const barById = new Map((barItems ?? []).map((b) => [b.id, b]));

  const logs = [];
  for (const p of portions) {
    const left = Number(p.row.quantity) - p.quantity;
    if (left <= 1e-9) {
      await admin.from("order_items").delete().eq("id", p.row.id).eq("order_id", orderId);
    } else {
      await admin.from("order_items")
        .update({ quantity: left, total_price: Math.round(Number(p.row.unit_price) * left) })
        .eq("id", p.row.id).eq("order_id", orderId);
    }

    if (p.returnedToStock && p.row.item_id) {
      const bi = barById.get(p.row.item_id);
      const perBottle = Number(bi?.shots_per_bottle ?? 0);
      const tracksShots = bi ? (isShotItem(bi) || perBottle > 1) : false;
      const { error } = await admin.rpc("adjust_bar_stock", {
        p_id: p.row.item_id, p_business: who.businessId,
        p_bottles_delta: p.quantity, p_shots_delta: tracksShots ? p.quantity * perBottle : 0,
      });
      if (error) console.error("[bar-void] stock return failed:", p.row.item_name, error.message);
    }

    logs.push({
      business_id: who.businessId,
      branch_id: who.branchId,
      order_id: orderId,
      table_label: tableLabel,
      item_id: p.row.item_id,
      item_type: p.row.item_type,
      item_name: p.row.item_name,
      serving: p.serving,
      quantity: p.quantity,
      unit_price: Number(p.row.unit_price),
      amount: Math.round(Number(p.row.unit_price) * p.quantity),
      reason,
      note: String(opts.note ?? "").trim() || null,
      returned_to_stock: p.returnedToStock,
      table_cancelled: !!opts.cancelTable,
      staff_id: who.staffId,
      staff_name: staff?.name ?? null,
    });
  }
  if (logs.length) {
    const { error } = await admin.from("order_item_voids").insert(logs);
    if (error) console.error("[bar-void] log failed:", error.message);
  }

  // New bill total.
  const { data: remainingRows } = await admin.from("order_items").select("total_price").eq("order_id", orderId);
  const total = (remainingRows ?? []).reduce((s, r) => s + Number(r.total_price), 0);

  if (opts.cancelTable) {
    await admin.from("orders").update({ status: "cancelled", total, updated_at: new Date().toISOString() }).eq("id", orderId);
    // Free the table, like after payment: fixed tables go back to empty, others disappear.
    if (order.table_id) {
      const { data: otherOpen } = await admin.from("orders").select("id")
        .eq("business_id", who.businessId).eq("table_id", order.table_id).neq("id", orderId)
        .not("status", "in", "(completed,cancelled)").limit(1);
      if (!otherOpen?.length) {
        const { data: t } = await admin.from("floor_tables").select("is_fixed").eq("id", order.table_id).eq("business_id", who.businessId).maybeSingle();
        await admin.from("floor_tables")
          .update(t?.is_fixed ? { status: "empty" } : { status: "empty", archived_at: new Date().toISOString() })
          .eq("id", order.table_id).eq("business_id", who.businessId);
      }
    }
  } else {
    await admin.from("orders").update({ total, updated_at: new Date().toISOString() }).eq("id", orderId);
  }

  return { ok: true, total, removed: portions.reduce((s, p) => s + p.quantity, 0) };
}
