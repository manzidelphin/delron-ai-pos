import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth";
import { sendSMS } from "@/lib/sms";

export async function POST(_request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { businessId, branchId, staffId } = auth;
  const supabase = createAdminClient();

  // Rwanda timezone (UTC+2)
  const now = new Date();
  const rwandaNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const today = rwandaNow.toISOString().split("T")[0];
  const todayStart = new Date(today + "T00:00:00+02:00").toISOString();

  // ── Fetch bartender info ──────────────────────────────────────────────────
  const { data: bartender } = await supabase
    .from("staff")
    .select("name, phone")
    .eq("id", staffId)
    .single();

  // ── Fetch business & owner ────────────────────────────────────────────────
  const { data: business } = await supabase
    .from("businesses")
    .select("name, phone, owner_id")
    .eq("id", businessId)
    .single();

  // Owner phone: prefer business.phone, fallback to staff with role=owner
  let ownerPhone: string | null = business?.phone ?? null;
  const ownerUserId: string | null = business?.owner_id ?? null;

  if (!ownerPhone) {
    const { data: ownerStaff } = await supabase
      .from("staff")
      .select("phone")
      .eq("business_id", businessId)
      .eq("role", "owner")
      .limit(1)
      .single();
    ownerPhone = ownerStaff?.phone ?? null;
  }

  // ── Fetch active bar items ────────────────────────────────────────────────
  const { data: items } = await supabase
    .from("bar_items")
    .select("id, name, quantity_bottles, shots_per_bottle, shots_remaining")
    .eq("business_id", businessId)
    .eq("is_active", true);

  const activeItems = items ?? [];

  // ── Opening stock: yesterday's closing count, or current quantity ─────────
  const yesterday = new Date(rwandaNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

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

  // ── Today's restocks ──────────────────────────────────────────────────────
  const { data: restocks } = await supabase
    .from("bar_restock_logs")
    .select("item_id, quantity_received")
    .eq("business_id", businessId)
    .gte("received_at", todayStart);

  const restockMap: Record<string, number> = {};
  (restocks ?? []).forEach((r: { item_id: string; quantity_received: number }) => {
    restockMap[r.item_id] = (restockMap[r.item_id] ?? 0) + Number(r.quantity_received);
  });

  // ── Today's sold quantities per item ──────────────────────────────────────
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
        const item = activeItems.find((i) => i.id === si.item_id);
        const spb = item?.shots_per_bottle ?? 1;
        soldMap[si.item_id] = (soldMap[si.item_id] ?? 0) + Number(si.quantity) / spb;
      }
    });
  }

  // ── Build and save stock snapshot ─────────────────────────────────────────
  const stockEntries = activeItems.map((item) => {
    const opening    = prevCountMap[item.id] ?? item.quantity_bottles;
    const restocked  = restockMap[item.id] ?? 0;
    const sold       = soldMap[item.id] ?? 0;
    const expected   = Math.max(0, opening + restocked - sold);
    const actual     = Number(item.quantity_bottles); // system count, not physical
    const variance   = expected - actual;
    const variance_pct = expected > 0 ? (variance / expected) * 100 : 0;

    return {
      business_id:       businessId,
      branch_id:         branchId,
      item_id:           item.id,
      count_date:        today,
      opening_quantity:  opening,
      restocked_today:   restocked,
      sold_today:        sold,
      expected_quantity: expected,
      actual_quantity:   actual,
      variance,
      variance_pct,
      counted_by:        staffId,
      notes:             "Auto-closed by bartender shift end",
    };
  });

  // Non-blocking: snapshot insert might fail if migration not yet run
  let stockSaved = false;
  try {
    if (stockEntries.length > 0) {
      const { error } = await supabase.from("daily_stock_counts").insert(stockEntries);
      if (!error) stockSaved = true;
      else console.error("[shift/end] stock snapshot error:", error.message);
    }
  } catch (e) {
    console.error("[shift/end] stock snapshot exception:", e);
  }

  // ── Shift revenue (transactions by this cashier today) ────────────────────
  const { data: shiftTxns } = await supabase
    .from("transactions")
    .select("total")
    .eq("business_id", businessId)
    .eq("cashier_id", staffId)
    .eq("module_source", "bar")
    .gte("created_at", todayStart);

  const totalRevenue = (shiftTxns ?? []).reduce(
    (s: number, t: { total: number }) => s + (Number(t.total) || 0),
    0
  );
  const totalOrders = (shiftTxns ?? []).length;
  const totalBottlesSold = Object.values(soldMap).reduce((s, v) => s + v, 0);

  // Variance items where difference ≥ 0.5 bottles
  const varianceItems = stockEntries
    .filter((e) => Math.abs(e.variance) >= 0.5)
    .map((e) => ({
      name: activeItems.find((i) => i.id === e.item_id)?.name ?? "Unknown",
      variance: e.variance,
    }));

  // ── In-app notification for owner ─────────────────────────────────────────
  if (ownerUserId) {
    try {
      const varNote = varianceItems.length > 0
        ? ` Variance on: ${varianceItems.map((v) => `${v.name} (${v.variance > 0 ? "-" : "+"}${Math.abs(v.variance).toFixed(1)} btl)`).join(", ")}.`
        : "";
      await supabase.from("notifications").insert({
        business_id: businessId,
        user_id:     ownerUserId,
        title:       `Shift Ended — ${bartender?.name ?? "Bartender"}`,
        message:     `${bartender?.name ?? "Bartender"} ended their shift. Revenue: ${totalRevenue.toLocaleString()} RWF · ${totalOrders} orders · ${totalBottlesSold.toFixed(1)} bottles sold.${varNote}`,
        type:        "info",
        category:    "staff",
        sent_via:    [],
      });
    } catch (e) {
      console.error("[shift/end] notification error:", e);
    }
  }

  // ── SMS to owner (fully silent fail) ──────────────────────────────────────
  if (ownerPhone) {
    try {
      const varLines = varianceItems
        .slice(0, 3)
        .map((v) => `⚠️ Variance: ${v.name} ${Math.abs(v.variance).toFixed(1)} btl`)
        .join("\n");

      const msg = [
        `DELRON POS - ${business?.name ?? "Bar"}`,
        `${bartender?.name ?? "Bartender"} ararangije akazi (shift ended)`,
        `Amafaranga: RWF ${totalRevenue.toLocaleString()}`,
        `Amabote yagurishijwe: ${totalBottlesSold.toFixed(1)}`,
        varLines,
        `Reba: delron-ai-pos.vercel.app/bar/stock`,
      ]
        .filter(Boolean)
        .join("\n");

      await sendSMS(ownerPhone, msg);
    } catch {
      // SMS failure never breaks the shift end
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      bartender_name:      bartender?.name ?? "Bartender",
      revenue:             totalRevenue,
      orders:              totalOrders,
      bottles_sold:        totalBottlesSold,
      variance_items:      varianceItems,
      stock_snapshot_saved: stockSaved,
    },
  });
}
