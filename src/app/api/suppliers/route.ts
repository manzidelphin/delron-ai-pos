import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const supabase = createClient();

  let query = supabase
    .from("suppliers")
    .select("*")
    .eq("business_id", auth.businessId)
    .eq("is_active", true)
    .order("name");

  if (search) {
    query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ suppliers: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name, contact_name, phone, email, address, notes } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      business_id: auth.businessId,
      name: name.trim(),
      contact_name: contact_name?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      notes: notes?.trim() || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ supplier: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { id, name, contact_name, phone, email, address, notes } = body;

  if (!id) return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });

  const supabase = createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .update({
      name: name.trim(),
      contact_name: contact_name?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", auth.businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ supplier: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Supplier ID required" }, { status: 400 });

  const supabase = createClient();

  const { error } = await supabase
    .from("suppliers")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", auth.businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
