import { GoogleGenerativeAI } from "@google/generative-ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  // Outer catch — ensures we always return valid JSON, never an empty body
  try {
    const auth = await getAuthContext();
    if (auth.error) return auth.error;

    const supabase = createAdminClient();
    const { businessId } = auth;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const [
      yesterdayTransactions,
      lowStockProducts,
      lowStockBarItems,
      lowStockMaterials,
      overdueCredits,
      openTabs,
      business,
    ] = await Promise.all([
      supabase.from("transactions").select("total, module_source").eq("business_id", businessId).gte("created_at", yesterdayStr).lt("created_at", today),
      supabase.from("products").select("name, quantity, min_quantity, unit").eq("business_id", businessId),
      supabase.from("bar_items").select("name, quantity_bottles, min_quantity").eq("business_id", businessId),
      supabase.from("raw_materials").select("name, quantity, min_quantity, unit").eq("business_id", businessId),
      supabase.from("credits").select("customer_name, balance").eq("business_id", businessId).eq("status", "overdue"),
      supabase.from("orders").select("id").eq("business_id", businessId).eq("status", "pending"),
      supabase.from("businesses").select("name").eq("id", businessId).single(),
    ]);

    const businessName = business.data?.name ?? "your business";
    const yesterdayRevenue = (yesterdayTransactions.data ?? []).reduce((s, t) => s + (t.total ?? 0), 0);

    const lowStock = [
      ...(lowStockProducts.data ?? []).filter(p => p.quantity <= p.min_quantity),
      ...(lowStockBarItems.data ?? []).filter(i => i.quantity_bottles <= i.min_quantity),
      ...(lowStockMaterials.data ?? []).filter(m => m.quantity <= m.min_quantity),
    ];

    const overdueList = overdueCredits.data ?? [];
    const openTabsCount = openTabs.data?.length ?? 0;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    // Build the static fallback — always available even if Gemini is down
    const staticFallback = {
      greeting: `${greeting}!`,
      revenue_summary: `Yesterday ${businessName} made ${yesterdayRevenue.toLocaleString()} RWF`,
      top_alert:
        lowStock.length > 0
          ? `${lowStock.length} item${lowStock.length > 1 ? "s are" : " is"} running low on stock`
          : overdueList.length > 0
          ? `${overdueList.length} customer${overdueList.length > 1 ? "s have" : " has"} overdue credit`
          : "All systems running smoothly",
      stock_alerts: lowStock.slice(0, 3).map(i => i.name),
      credit_alerts: overdueList.slice(0, 3).map(c => `${c.customer_name}: ${Number(c.balance).toLocaleString()} RWF`),
      tip: "Review your top-selling products and ensure stock is always above minimum levels.",
      raw_data: {
        yesterday_revenue: yesterdayRevenue,
        low_stock_count: lowStock.length,
        overdue_count: overdueList.length,
        open_tabs: openTabsCount,
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[AI Briefing] GEMINI_API_KEY is not set in environment");
      return NextResponse.json(staticFallback);
    }

    const briefingPrompt = `Generate a concise daily business briefing for ${businessName}.

Data:
- Yesterday's revenue: ${yesterdayRevenue.toLocaleString()} RWF
- Low stock items: ${lowStock.length} items
- Overdue credits: ${overdueList.length} customers (${overdueList.reduce((s, c) => s + c.balance, 0).toLocaleString()} RWF)
- Open bar tabs: ${openTabsCount}

Return a JSON object with these exact fields:
{
  "greeting": "${greeting}!",
  "revenue_summary": "one sentence about yesterday's revenue",
  "top_alert": "the most important thing the owner needs to know right now",
  "stock_alerts": ["array", "of", "brief", "stock", "alert", "strings"],
  "credit_alerts": ["array", "of", "brief", "credit", "alert", "strings"],
  "tip": "one practical AI business tip relevant to current data"
}

Keep each field under 100 characters. Return only valid JSON, no markdown code blocks.`;

    try {
      // Instantiate inside handler so constructor errors are caught here
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(briefingPrompt);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[AI Briefing] Gemini returned non-JSON text:", text.slice(0, 200));
        return NextResponse.json({ ...staticFallback, raw_data: staticFallback.raw_data });
      }

      const briefing = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        greeting:        briefing.greeting        ?? staticFallback.greeting,
        revenue_summary: briefing.revenue_summary ?? staticFallback.revenue_summary,
        top_alert:       briefing.top_alert       ?? staticFallback.top_alert,
        stock_alerts:    briefing.stock_alerts     ?? staticFallback.stock_alerts,
        credit_alerts:   briefing.credit_alerts    ?? staticFallback.credit_alerts,
        tip:             briefing.tip              ?? staticFallback.tip,
        raw_data:        staticFallback.raw_data,
      });
    } catch (geminiErr) {
      console.error("[AI Briefing] Gemini API error:", geminiErr);
      return NextResponse.json(staticFallback);
    }
  } catch (err) {
    console.error("[AI Briefing] Unhandled route error:", err);
    return NextResponse.json(
      { error: "Internal server error", greeting: "Good day!", revenue_summary: "Unable to load briefing", top_alert: "AI service unavailable", stock_alerts: [], credit_alerts: [], tip: "", raw_data: { yesterday_revenue: 0, low_stock_count: 0, overdue_count: 0, open_tabs: 0 } },
      { status: 500 }
    );
  }
}
