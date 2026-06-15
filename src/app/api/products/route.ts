import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { generateBarcode } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const stockStatus = searchParams.get("stock_status") ?? "all";
  const sortBy = searchParams.get("sort_by") ?? "created_at";
  const sortDir = searchParams.get("sort_dir") === "asc" ? true : false;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select("*, suppliers(name)", { count: "exact" })
    .eq("business_id", auth.businessId)
    .eq("is_active", true)
    .eq("stock_type", "supermarket")
    .order(sortBy, { ascending: sortDir })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`);
  }
  if (category && category !== "all") {
    query = query.eq("category", category);
  }
  if (stockStatus === "low") {
    // quantity <= min_quantity but > 0
    query = query.gt("quantity", 0).lte("quantity", 5);
  } else if (stockStatus === "out") {
    query = query.eq("quantity", 0);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    products: data ?? [],
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();
  const body = await request.json();

  const productData = {
    business_id: auth.businessId,
    branch_id: auth.branchId,
    name: body.name,
    barcode: body.barcode || generateBarcode(),
    category: body.category ?? "General",
    subcategory: body.subcategory ?? null,
    description: body.description ?? null,
    price: parseFloat(body.price) || 0,
    cost_price: parseFloat(body.cost_price) || 0,
    stock_type: "supermarket" as const,
    quantity: parseFloat(body.quantity) || 0,
    min_quantity: parseFloat(body.min_quantity) || 5,
    unit: body.unit ?? "piece",
    expiry_date: body.expiry_date || null,
    supplier_id: body.supplier_id || null,
    image_url: body.image_url || null,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("products")
    .insert(productData)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A product with this barcode already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
