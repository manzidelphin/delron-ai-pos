import { GoogleGenerativeAI } from "@google/generative-ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { message } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const businessId = auth.businessId;
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    todayOrders,
    lowStockProducts,
    lowStockBarItems,
    lowStockMaterials,
    openCredits,
    overdueCredits,
    todayProduction,
    openTabs,
    recentTransactions,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("total, module_source, created_at")
      .eq("business_id", businessId)
      .gte("created_at", today),
    supabase
      .from("products")
      .select("name, quantity, min_quantity, unit")
      .eq("business_id", businessId)
      .limit(10),
    supabase
      .from("bar_items")
      .select("name, quantity_bottles, min_quantity")
      .eq("business_id", businessId)
      .limit(10),
    supabase
      .from("raw_materials")
      .select("name, quantity, min_quantity, unit")
      .eq("business_id", businessId)
      .limit(10),
    supabase
      .from("credits")
      .select("customer_name, balance, due_date, status")
      .eq("business_id", businessId)
      .neq("status", "paid")
      .limit(20),
    supabase
      .from("credits")
      .select("customer_name, customer_phone, balance")
      .eq("business_id", businessId)
      .eq("status", "overdue")
      .limit(10),
    supabase
      .from("production_logs")
      .select("quantity_produced, finished_good_id")
      .eq("business_id", businessId)
      .gte("created_at", today),
    supabase
      .from("orders")
      .select("total, table_id, status")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .limit(10),
    supabase
      .from("transactions")
      .select("total, module_source, created_at")
      .eq("business_id", businessId)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false }),
  ]);

  const todayRevenue = (todayOrders.data ?? []).reduce(
    (sum, t) => sum + (t.total ?? 0),
    0
  );

  const todayByModule = (todayOrders.data ?? []).reduce(
    (acc: Record<string, number>, t) => {
      if (t.module_source) {
        acc[t.module_source] = (acc[t.module_source] ?? 0) + t.total;
      }
      return acc;
    },
    {}
  );

  const totalOutstanding = (openCredits.data ?? []).reduce(
    (sum, c) => sum + (c.balance ?? 0),
    0
  );

  const weekRevenue = (recentTransactions.data ?? []).reduce(
    (sum, t) => sum + (t.total ?? 0),
    0
  );

  const lowProducts = (lowStockProducts.data ?? []).filter(
    (p) => p.quantity <= p.min_quantity
  );
  const lowBar = (lowStockBarItems.data ?? []).filter(
    (i) => i.quantity_bottles <= i.min_quantity
  );
  const lowMaterials = (lowStockMaterials.data ?? []).filter(
    (m) => m.quantity <= m.min_quantity
  );

  const systemInstruction = `You are DELRON AI, the smart business assistant for this business. You have access to real-time business data.
Always respond helpfully, clearly, and concisely. You can respond in English or Kinyarwanda depending on what language the user writes in.
Always format money as "X,XXX RWF".

CURRENT BUSINESS DATA (RIGHT NOW):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TODAY'S REVENUE: ${todayRevenue.toLocaleString()} RWF
By module:
${
  Object.entries(todayByModule)
    .map(([m, v]) => `  - ${m}: ${Number(v).toLocaleString()} RWF`)
    .join("\n") || "  No sales yet today"
}

STOCK ALERTS:
Low stock products (${lowProducts.length}):
${
  lowProducts
    .map((p) => `  - ${p.name}: ${p.quantity} ${p.unit} left (min: ${p.min_quantity})`)
    .join("\n") || "  None"
}

Low bar items (${lowBar.length}):
${lowBar.map((i) => `  - ${i.name}: ${i.quantity_bottles} bottles left`).join("\n") || "  None"}

Low bakery ingredients (${lowMaterials.length}):
${lowMaterials.map((m) => `  - ${m.name}: ${m.quantity} ${m.unit} left`).join("\n") || "  None"}

CREDITS & DEBTS:
Total outstanding: ${totalOutstanding.toLocaleString()} RWF
Number of open credits: ${openCredits.data?.length ?? 0}
Overdue credits: ${overdueCredits.data?.length ?? 0}
${
  (overdueCredits.data ?? [])
    .map((c) => `  - ${c.customer_name}: ${Number(c.balance).toLocaleString()} RWF overdue`)
    .join("\n") || ""
}

OPEN BAR TABS: ${openTabs.data?.length ?? 0} tables
TODAY'S PRODUCTION LOGS: ${todayProduction.data?.length ?? 0} batches

LAST 7 DAYS:
Total revenue: ${weekRevenue.toLocaleString()} RWF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction,
  });

  const result = await model.generateContent(message);
  const aiResponse = result.response.text();

  // Save conversation
  void supabase.from("ai_conversations").insert([
    { business_id: businessId, user_id: auth.staffId, role: "user", message },
    { business_id: businessId, user_id: auth.staffId, role: "assistant", message: aiResponse },
  ]);

  return NextResponse.json({ response: aiResponse });
}
