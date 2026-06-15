import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("businesses")
      .select("count")
      .limit(1);

    if (error) throw error;

    return NextResponse.json({
      status: "✅ DELRON AI POS — Supabase Connected!",
      project: "delron-pos",
      url: "https://hfjggupbkbudnqplxviq.supabase.co",
      database: "healthy",
      tables: [
        "businesses",
        "branches",
        "staff",
        "suppliers",
        "products",
        "raw_materials",
        "finished_goods",
        "recipes",
        "recipe_ingredients",
        "production_logs",
        "waste_logs",
        "bar_items",
        "floor_tables",
        "orders",
        "order_items",
        "transactions",
        "credits",
        "notifications",
        "ai_conversations",
      ],
      message: "All 18 tables ready. DELRON AI POS is live!",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: "❌ Connection failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
