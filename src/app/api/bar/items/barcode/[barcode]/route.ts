import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: { barcode: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createClient();

  const { data, error } = await supabase
    .from("bar_items")
    .select("*")
    .eq("barcode", params.barcode)
    .eq("business_id", auth.businessId)
    .eq("is_active", true)
    .single();

  if (error || !data) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  return NextResponse.json({ item: data });
}
