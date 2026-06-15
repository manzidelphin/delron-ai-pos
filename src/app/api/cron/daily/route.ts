import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendSMS, SMS_TEMPLATES } from "@/lib/sms";

export async function POST(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, phone");

  if (!businesses?.length) {
    return NextResponse.json({ message: "No businesses found" });
  }

  const results: Record<string, unknown>[] = [];

  for (const business of businesses) {
    const result: Record<string, number> = {
      due_today_reminders: 0,
      overdue_alerts: 0,
      low_stock_alerts: 0,
    };

    // 1. Credits due today
    const { data: dueToday } = await supabase
      .from("credits")
      .select("*")
      .eq("business_id", business.id)
      .eq("due_date", today)
      .neq("status", "paid");

    for (const credit of dueToday ?? []) {
      void sendSMS(
        credit.customer_phone,
        SMS_TEMPLATES.creditDueReminder(credit.customer_name, credit.balance, business.name)
      );
      if (business.phone) {
        void sendSMS(
          business.phone,
          SMS_TEMPLATES.ownerDueReminder(credit.customer_name, credit.customer_phone, credit.balance)
        );
      }
      result.due_today_reminders++;
    }

    // 2. Credits 2+ days overdue
    const { data: overdueCredits } = await supabase
      .from("credits")
      .select("*")
      .eq("business_id", business.id)
      .lte("due_date", twoDaysAgo)
      .neq("status", "paid");

    if (business.phone) {
      for (const credit of overdueCredits ?? []) {
        const dueDate = new Date(credit.due_date);
        const daysOverdue = Math.floor(
          (Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        void sendSMS(
          business.phone,
          SMS_TEMPLATES.ownerOverdueAlert(
            credit.customer_name,
            credit.customer_phone,
            credit.balance,
            daysOverdue
          )
        );
        result.overdue_alerts++;
      }
    }

    // 3. Low stock alerts
    const [{ data: products }, { data: barItems }, { data: materials }] =
      await Promise.all([
        supabase
          .from("products")
          .select("name, quantity, min_quantity, unit")
          .eq("business_id", business.id),
        supabase
          .from("bar_items")
          .select("name, quantity_bottles, min_quantity")
          .eq("business_id", business.id),
        supabase
          .from("raw_materials")
          .select("name, quantity, min_quantity, unit")
          .eq("business_id", business.id),
      ]);

    if (business.phone) {
      const lowProducts = (products ?? []).filter((p) => p.quantity <= p.min_quantity);
      const lowBar = (barItems ?? []).filter(
        (i) => i.quantity_bottles <= i.min_quantity
      );
      const lowMaterials = (materials ?? []).filter((m) => m.quantity <= m.min_quantity);

      for (const item of lowProducts) {
        void sendSMS(
          business.phone,
          SMS_TEMPLATES.lowStockAlert(item.name, item.quantity, item.unit, business.name)
        );
        result.low_stock_alerts++;
      }
      for (const item of lowBar) {
        void sendSMS(
          business.phone,
          SMS_TEMPLATES.lowStockAlert(item.name, item.quantity_bottles, "bottles", business.name)
        );
        result.low_stock_alerts++;
      }
      for (const item of lowMaterials) {
        void sendSMS(
          business.phone,
          SMS_TEMPLATES.lowStockAlert(item.name, item.quantity, item.unit, business.name)
        );
        result.low_stock_alerts++;
      }

      // 4. Daily summary SMS
      const { data: yesterdayTx } = await supabase
        .from("transactions")
        .select("total")
        .eq("business_id", business.id)
        .gte("created_at", yesterday)
        .lt("created_at", today);

      const yesterdayRevenue = (yesterdayTx ?? []).reduce(
        (sum, t) => sum + t.total,
        0
      );

      void sendSMS(
        business.phone,
        SMS_TEMPLATES.dailySummary(
          business.name,
          yesterdayRevenue,
          lowProducts.length + lowBar.length + lowMaterials.length,
          overdueCredits?.length ?? 0
        )
      );
    }

    results.push({ business: business.name, ...result });
  }

  return NextResponse.json({ success: true, results });
}
