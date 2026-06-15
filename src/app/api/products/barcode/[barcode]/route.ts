import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { barcode: string } }
) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();

  // Search in products first
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", auth.businessId)
    .eq("barcode", params.barcode)
    .eq("is_active", true)
    .single();

  if (product) {
    return NextResponse.json({ found: true, type: "product", item: product });
  }

  // Then search bar items
  const { data: barItem } = await supabase
    .from("bar_items")
    .select("*")
    .eq("business_id", auth.businessId)
    .eq("barcode", params.barcode)
    .eq("is_active", true)
    .single();

  if (barItem) {
    return NextResponse.json({ found: true, type: "bar_item", item: barItem });
  }

  // Then finished goods (bakery)
  const { data: finishedGood } = await supabase
    .from("finished_goods")
    .select("*")
    .eq("business_id", auth.businessId)
    .eq("barcode", params.barcode)
    .eq("is_active", true)
    .single();

  if (finishedGood) {
    return NextResponse.json({
      found: true,
      type: "finished_good",
      item: finishedGood,
      is_generic: finishedGood.barcode_type === "generic",
    });
  }

  return NextResponse.json({ found: false }, { status: 404 });
}
