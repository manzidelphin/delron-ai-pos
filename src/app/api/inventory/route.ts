import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const [productsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, quantity, min_quantity, cost_price, price, category, supplier_id, suppliers(name)")
      .eq("business_id", auth.businessId)
      .eq("is_active", true)
      .eq("stock_type", "supermarket"),
  ]);

  const products = productsRes.data ?? [];

  // Calculate stats
  const totalValue = products.reduce((sum, p) => sum + p.quantity * p.cost_price, 0);
  const lowStockItems = products.filter(
    (p) => p.quantity > 0 && p.quantity <= p.min_quantity
  );
  const outOfStock = products.filter((p) => p.quantity === 0);

  // Category breakdown
  const byCategory: Record<string, { count: number; value: number; qty: number }> = {};
  for (const p of products) {
    const cat = p.category ?? "Other";
    if (!byCategory[cat]) byCategory[cat] = { count: 0, value: 0, qty: 0 };
    byCategory[cat].count++;
    byCategory[cat].value += p.quantity * p.cost_price;
    byCategory[cat].qty += p.quantity;
  }

  const categoryChart = Object.entries(byCategory).map(([name, data]) => ({
    name,
    count: data.count,
    value: data.value,
    quantity: data.qty,
  }));

  return NextResponse.json({
    stats: {
      total_products: products.length,
      total_value: totalValue,
      low_stock_count: lowStockItems.length,
      out_of_stock_count: outOfStock.length,
    },
    low_stock: lowStockItems,
    out_of_stock: outOfStock.slice(0, 20),
    category_chart: categoryChart,
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const body = await request.json();
  const { product_id, adjustment_type, quantity, reason } = body;

  if (!product_id || !adjustment_type || quantity === undefined) {
    return NextResponse.json({ error: "product_id, adjustment_type, and quantity required" }, { status: 400 });
  }

  const { data: product } = await supabase
    .from("products")
    .select("quantity")
    .eq("id", product_id)
    .eq("business_id", auth.businessId)
    .single();

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  let newQty: number;
  if (adjustment_type === "set") {
    newQty = parseFloat(quantity);
  } else if (adjustment_type === "add") {
    newQty = product.quantity + parseFloat(quantity);
  } else if (adjustment_type === "subtract") {
    newQty = Math.max(0, product.quantity - parseFloat(quantity));
  } else {
    return NextResponse.json({ error: "Invalid adjustment_type" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("products")
    .update({ quantity: newQty, updated_at: new Date().toISOString() })
    .eq("id", product_id)
    .eq("business_id", auth.businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    product: updated,
    previous_qty: product.quantity,
    new_qty: newQty,
    reason,
  });
}
