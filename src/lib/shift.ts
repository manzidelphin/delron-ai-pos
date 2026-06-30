import { createAdminClient } from "@/lib/supabase/admin";
import { sendSMS } from "@/lib/sms";

export interface ShiftSummary {
  staff_name: string;
  role: string;
  duration: string;
  total_sales: number;
  total_orders: number;
  total_items_sold: number;
  opening_cash: number | null;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_variance: number | null;
  variance_items: { name: string; variance: number }[];
  stock_snapshot_saved: boolean;
  batches_produced: number;
}

/**
 * Close the active shift for a staff member, computing all sales/orders/role
 * metrics and persisting them to the shifts table. Sends the owner notification
 * and SMS. Called by both the explicit "End Shift" API route and the
 * auto-close-on-new-login path in the shift start route.
 *
 * Returns the summary even when there is no active shift (zeroed values).
 */
export async function closeShift({
  businessId,
  branchId,
  staffId,
  closingCash,
  notes,
}: {
  businessId: string;
  branchId: string;
  staffId: string;
  closingCash: number | null;
  notes: string | null;
}): Promise<ShiftSummary> {
  const supabase = createAdminClient();
  const now = new Date();
  // Keep local alias so the body below is a near-verbatim copy of the original.
  const closing_cash = closingCash;

  // ── Find active shift ─────────────────────────────────────────────────────
  const { data: shift } = await supabase
    .from("shifts")
    .select("*")
    .eq("staff_id", staffId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const shiftStarted = shift?.started_at ?? now.toISOString();
  const role: string = shift?.role ?? "cashier";

  // ── Business + owner info ─────────────────────────────────────────────────
  const [{ data: business }, { data: staffRecord }] = await Promise.all([
    supabase.from("businesses").select("name, phone, owner_id").eq("id", businessId).single(),
    supabase.from("staff").select("name, phone").eq("id", staffId).single(),
  ]);

  let ownerPhone: string | null = business?.phone ?? null;
  const ownerUserId: string | null = business?.owner_id ?? null;
  if (!ownerPhone) {
    const { data: ownerStaff } = await supabase
      .from("staff").select("phone").eq("business_id", businessId).eq("role", "owner").limit(1).single();
    ownerPhone = ownerStaff?.phone ?? null;
  }

  // ── Sales during shift ────────────────────────────────────────────────────
  const { data: shiftTxns } = await supabase
    .from("transactions")
    .select("total, payment_method")
    .eq("business_id", businessId)
    .eq("cashier_id", staffId)
    .gte("created_at", shiftStarted);

  const totalSales  = (shiftTxns ?? []).reduce((s, t) => s + (Number(t.total) || 0), 0);
  const totalOrders = (shiftTxns ?? []).length;
  const cashSales   = (shiftTxns ?? []).filter((t) => t.payment_method === "cash").reduce((s, t) => s + (Number(t.total) || 0), 0);

  // ── Role-specific extras ──────────────────────────────────────────────────
  let totalItemsSold  = 0;
  let varianceItems: { name: string; variance: number }[] = [];
  let stockSaved      = false;
  let batchesProduced = 0;

  const rwandaNow  = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const today      = rwandaNow.toISOString().split("T")[0];
  const todayStart = new Date(today + "T00:00:00+02:00").toISOString();
  const yesterday  = new Date(rwandaNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // ── Cashier / Supermarket: count items sold ───────────────────────────────
  if (role === "cashier") {
    const { data: todayOrderIds } = await supabase
      .from("orders")
      .select("id")
      .eq("business_id", businessId)
      .eq("cashier_id", staffId)
      .gte("created_at", shiftStarted);

    if ((todayOrderIds ?? []).length > 0) {
      const ids = (todayOrderIds ?? []).map((o: { id: string }) => o.id);
      const { data: items } = await supabase
        .from("order_items")
        .select("quantity")
        .in("order_id", ids);
      totalItemsSold = (items ?? []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    }
  }

  // ── Bartender: stock snapshot + items sold ────────────────────────────────
  if (role === "bartender") {
    const { data: activeItems } = await supabase
      .from("bar_items")
      .select("id, name, quantity_bottles, shots_per_bottle")
      .eq("business_id", businessId)
      .eq("is_active", true);

    const items = activeItems ?? [];

    const { data: prevCounts } = await supabase
      .from("daily_stock_counts")
      .select("item_id, actual_quantity")
      .eq("business_id", businessId)
      .eq("count_date", yesterdayStr)
      .order("created_at", { ascending: false });

    const prevCountMap: Record<string, number> = {};
    (prevCounts ?? []).forEach((c: { item_id: string; actual_quantity: number }) => {
      if (!(c.item_id in prevCountMap)) prevCountMap[c.item_id] = c.actual_quantity;
    });

    const { data: restocks } = await supabase
      .from("bar_restock_logs")
      .select("item_id, quantity_received")
      .eq("business_id", businessId)
      .gte("received_at", todayStart);

    const restockMap: Record<string, number> = {};
    (restocks ?? []).forEach((r: { item_id: string; quantity_received: number }) => {
      restockMap[r.item_id] = (restockMap[r.item_id] ?? 0) + Number(r.quantity_received);
    });

    const { data: todayOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("business_id", businessId)
      .eq("order_type", "bar_tab")
      .eq("status", "completed")
      .gte("created_at", todayStart);

    const soldMap: Record<string, number> = {};
    const orderIds = (todayOrders ?? []).map((o: { id: string }) => o.id);
    if (orderIds.length > 0) {
      const { data: soldItems } = await supabase
        .from("order_items")
        .select("item_id, quantity, notes")
        .in("order_id", orderIds)
        .eq("item_type", "bar_item");

      (soldItems ?? []).forEach((si: { item_id: string; quantity: number; notes?: string }) => {
        const isShot = si.notes?.toLowerCase().includes("shot") ?? false;
        if (!isShot) {
          soldMap[si.item_id] = (soldMap[si.item_id] ?? 0) + Number(si.quantity);
        } else {
          const item = items.find((i) => i.id === si.item_id);
          soldMap[si.item_id] = (soldMap[si.item_id] ?? 0) + Number(si.quantity) / (item?.shots_per_bottle ?? 1);
        }
      });
    }

    totalItemsSold = Object.values(soldMap).reduce((s, v) => s + v, 0);

    const stockEntries = items.map((item) => {
      const opening   = prevCountMap[item.id] ?? item.quantity_bottles;
      const restocked = restockMap[item.id] ?? 0;
      const sold      = soldMap[item.id] ?? 0;
      const expected  = Math.max(0, opening + restocked - sold);
      const actual    = Number(item.quantity_bottles);
      const variance  = expected - actual;
      return {
        business_id: businessId, branch_id: branchId,
        item_id: item.id, count_date: today,
        opening_quantity: opening, restocked_today: restocked, sold_today: sold,
        expected_quantity: expected, actual_quantity: actual,
        variance, variance_pct: expected > 0 ? (variance / expected) * 100 : 0,
        counted_by: staffId, notes: "Auto-closed by bartender shift end",
      };
    });

    try {
      if (stockEntries.length > 0) {
        const { error } = await supabase.from("daily_stock_counts").insert(stockEntries);
        if (!error) stockSaved = true;
      }
    } catch (e) {
      console.error("[closeShift] bartender stock snapshot error:", e);
    }

    varianceItems = stockEntries
      .filter((e) => Math.abs(e.variance) >= 0.5)
      .map((e) => ({ name: items.find((i) => i.id === e.item_id)?.name ?? "Unknown", variance: e.variance }));
  }

  // ── Baker: production batches today ──────────────────────────────────────
  if (role === "baker") {
    const { data: prodLogs } = await supabase
      .from("production_logs")
      .select("quantity_produced")
      .eq("business_id", businessId)
      .gte("created_at", shiftStarted);
    batchesProduced = (prodLogs ?? []).reduce((s, l) => s + (Number(l.quantity_produced) || 0), 0);
  }

  // ── Waiter: orders from tables served ────────────────────────────────────
  if (role === "waiter") {
    const { data: waiterOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("business_id", businessId)
      .eq("cashier_id", staffId)
      .gte("created_at", shiftStarted);
    const ids = (waiterOrders ?? []).map((o: { id: string }) => o.id);
    if (ids.length > 0) {
      const { data: items } = await supabase
        .from("order_items").select("quantity").in("order_id", ids);
      totalItemsSold = (items ?? []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    }
  }

  // ── Cash reconciliation ───────────────────────────────────────────────────
  const openingCash  = shift?.opening_cash ?? null;
  const expectedCash = openingCash !== null ? openingCash + cashSales : null;
  // cashVariance is null when closing_cash wasn't provided (auto-close) — shows as "—" in reports
  const cashVariance = closing_cash !== null && expectedCash !== null ? closing_cash - expectedCash : null;

  // ── Duration ──────────────────────────────────────────────────────────────
  const durationMs    = now.getTime() - new Date(shiftStarted).getTime();
  const durationHrs   = Math.floor(durationMs / 3_600_000);
  const durationMins  = Math.floor((durationMs % 3_600_000) / 60_000);
  const durationLabel = durationHrs > 0 ? `${durationHrs}h ${durationMins}m` : `${durationMins}m`;

  // ── Update shift record ───────────────────────────────────────────────────
  if (shift) {
    await supabase.from("shifts").update({
      ended_at:         now.toISOString(),
      closing_cash,
      expected_cash:    expectedCash,
      cash_variance:    cashVariance,
      total_sales:      totalSales,
      total_orders:     totalOrders,
      total_items_sold: totalItemsSold,
      status:           "ended",
      notes,
    }).eq("id", shift.id);
  }

  // ── In-app notification ───────────────────────────────────────────────────
  const staffName = staffRecord?.name ?? "Staff";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  if (ownerUserId) {
    try {
      const cashNote  = cashVariance !== null
        ? ` Cash: ${cashVariance >= 0 ? "+" : ""}${Math.round(cashVariance).toLocaleString()} RWF variance.`
        : "";
      const varNote   = varianceItems.length > 0
        ? ` Stock variance: ${varianceItems.map((v) => `${v.name} (${v.variance > 0 ? "-" : "+"}${Math.abs(v.variance).toFixed(1)} btl)`).join(", ")}.`
        : "";
      const bakerNote = role === "baker" ? ` Produced: ${batchesProduced} units.` : "";

      await supabase.from("notifications").insert({
        business_id: businessId,
        user_id:     ownerUserId,
        title:       `Shift Ended — ${staffName} (${roleLabel})`,
        message:     `${staffName} ended their ${durationLabel} shift. Revenue: ${Math.round(totalSales).toLocaleString()} RWF · ${totalOrders} orders.${cashNote}${varNote}${bakerNote}`,
        type:        cashVariance !== null && Math.abs(cashVariance / (expectedCash || 1)) > 0.02 ? "warning" : "info",
        category:    "staff",
        sent_via:    [],
      });
    } catch (e) {
      console.error("[closeShift] notification error:", e);
    }
  }

  // ── SMS to owner ──────────────────────────────────────────────────────────
  if (ownerPhone) {
    try {
      const cashLine = cashVariance !== null
        ? `\nCash: ${cashVariance >= 0 ? "+" : ""}${Math.round(cashVariance).toLocaleString()} RWF`
        : "";
      const varLine = varianceItems.slice(0, 2).map((v) => `\n⚠️ ${v.name} ${Math.abs(v.variance).toFixed(1)} btl`).join("");

      await sendSMS(ownerPhone, [
        `DELRON POS - ${business?.name ?? ""}`,
        `${staffName} (${roleLabel}) ararangije akazi (${durationLabel})`,
        `Amafaranga: RWF ${Math.round(totalSales).toLocaleString()}`,
        `Amabicuruzwa: ${totalOrders} orders`,
        cashLine,
        varLine,
      ].filter(Boolean).join("\n"));
    } catch {
      // SMS failure is non-fatal
    }
  }

  return {
    staff_name:           staffName,
    role,
    duration:             durationLabel,
    total_sales:          totalSales,
    total_orders:         totalOrders,
    total_items_sold:     totalItemsSold,
    opening_cash:         openingCash,
    closing_cash,
    expected_cash:        expectedCash,
    cash_variance:        cashVariance,
    variance_items:       varianceItems,
    stock_snapshot_saved: stockSaved,
    batches_produced:     batchesProduced,
  };
}
