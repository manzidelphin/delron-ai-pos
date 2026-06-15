import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { generateBarcode } from "@/lib/utils";

interface ImportRow {
  name: string;
  barcode?: string;
  category?: string;
  price: number;
  cost_price?: number;
  quantity?: number;
  min_quantity?: number;
  unit?: string;
  expiry_date?: string;
  supplier_name?: string;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  const body = await request.json();
  const rows: ImportRow[] = body.rows ?? [];

  if (!rows.length) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  // Resolve supplier names → IDs
  const supplierNames = [...new Set(rows.map((r) => r.supplier_name).filter(Boolean))];
  const supplierMap: Record<string, string> = {};

  if (supplierNames.length > 0) {
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("business_id", auth.businessId)
      .in("name", supplierNames as string[]);

    suppliers?.forEach((s) => {
      supplierMap[s.name.toLowerCase()] = s.id;
    });
  }

  const toInsert = rows.map((row) => ({
    business_id: auth.businessId,
    branch_id: auth.branchId,
    name: row.name,
    barcode: row.barcode || generateBarcode(),
    category: row.category ?? "General",
    price: parseFloat(String(row.price)) || 0,
    cost_price: parseFloat(String(row.cost_price ?? 0)) || 0,
    stock_type: "supermarket" as const,
    quantity: parseFloat(String(row.quantity ?? 0)) || 0,
    min_quantity: parseFloat(String(row.min_quantity ?? 5)) || 5,
    unit: row.unit ?? "piece",
    expiry_date: row.expiry_date || null,
    supplier_id: row.supplier_name
      ? supplierMap[row.supplier_name.toLowerCase()] ?? null
      : null,
    is_active: true,
  }));

  // Batch insert in chunks of 50
  const chunkSize = 50;
  let imported = 0;
  const errors: string[] = [];

  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("products")
      .upsert(chunk, { onConflict: "business_id,barcode", ignoreDuplicates: false })
      .select("id");

    if (error) {
      errors.push(`Rows ${i + 1}–${i + chunk.length}: ${error.message}`);
    } else {
      imported += data?.length ?? 0;
    }
  }

  return NextResponse.json({
    imported,
    total: rows.length,
    errors,
    success: errors.length === 0,
  });
}
