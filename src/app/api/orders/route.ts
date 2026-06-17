import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { generateReceiptNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("orders")
    .select("*, order_items(*)", { count: "exact" })
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const body = await request.json();

  const {
    items,
    payment_method,
    subtotal,
    order_type = "counter",
    notes,
    // payment details
    amount_paid,
    change_given,
    customer_phone: payerPhone,
    // credit details
    customer_name,
    customer_phone: creditPhone,
    due_date,
  } = body;

  // Handle both field naming conventions from the POS
  const discountAmt: number = body.discount_amount ?? body.discount ?? 0;
  const totalAmt: number = body.total_amount ?? body.total ?? (subtotal - discountAmt);

  if (!items?.length) {
    return NextResponse.json({ error: "No items in order" }, { status: 400 });
  }

  const isCredit = !!(customer_name && due_date);
  const finalOrderType = isCredit ? "credit" : order_type;
  const finalPaymentMethod = isCredit ? "credit" : payment_method;

  // Fetch names for receipt in parallel
  const [bizResult, branchResult, staffResult] = await Promise.all([
    supabase.from("businesses").select("name").eq("id", auth.businessId).single(),
    supabase.from("branches").select("name").eq("id", auth.branchId).single(),
    supabase.from("staff").select("name").eq("id", auth.staffId).single(),
  ]);
  const businessName = bizResult.data?.name ?? "My Business";
  const branchName = branchResult.data?.name ?? "Main Branch";
  const cashierName = staffResult.data?.name ?? "Cashier";

  // 1. Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      business_id: auth.businessId,
      branch_id: auth.branchId,
      staff_id: auth.staffId,
      order_type: finalOrderType,
      status: "completed",
      subtotal,
      discount: discountAmt,
      tax: 0,
      total: totalAmt,
      payment_method: finalPaymentMethod,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (orderError || !order) {
    console.error("[orders] order insert failed:", orderError);
    return NextResponse.json({ error: orderError?.message ?? "Order creation failed" }, { status: 500 });
  }

  // 2. Insert order items — accept both product_id/product_type and item_id/item_type
  const orderItems = (items as Record<string, unknown>[]).map((item) => ({
    order_id: order.id,
    item_id: (item.item_id ?? item.product_id) as string,
    item_type: (item.item_type ?? item.product_type ?? "product") as string,
    item_name: item.item_name as string,
    quantity: item.quantity as number,
    unit_price: item.unit_price as number,
    total_price: item.total_price as number,
    notes: (item.notes as string | undefined) ?? null,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) {
    console.error("[orders] order_items insert failed:", itemsError);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // 3. Create transaction record (not for credit orders — payment happens later)
  const receiptNumber = generateReceiptNumber();
  // Determine module source: "bakery" only when every item is a finished_good
  const allBakery = (items as Record<string, unknown>[]).every(
    (i) => (i.item_type ?? i.product_type) === "finished_good"
  );
  const moduleSource = allBakery ? "bakery" : "supermarket";
  if (!isCredit) {
    const { error: txError } = await supabase
      .from("transactions")
      .insert({
        business_id: auth.businessId,
        branch_id: auth.branchId,
        order_id: order.id,
        cashier_id: auth.staffId,
        total: totalAmt,
        payment_method: finalPaymentMethod,
        receipt_number: receiptNumber,
        module_source: moduleSource,
      });

    if (txError) {
      console.error("[orders] transaction insert failed:", txError);
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }
  }

  // 4. Create credit record when it's a credit sale
  if (isCredit) {
    const itemsDescription = (items as Record<string, unknown>[])
      .map((i) => `${i.quantity}x ${i.item_name}`)
      .join(", ");

    const { error: creditError } = await supabase
      .from("credits")
      .insert({
        business_id: auth.businessId,
        branch_id: auth.branchId,
        order_id: order.id,
        customer_name,
        customer_phone: creditPhone ?? payerPhone ?? null,
        items_description: itemsDescription,
        total_amount: totalAmt,
        amount_paid: 0,
        balance: totalAmt,
        due_date,
        status: "unpaid",
        created_by: auth.staffId,
        notes: notes ?? null,
      });

    if (creditError) {
      console.error("[orders] credit record insert failed:", creditError);
      // Don't fail the whole order — credit record is supplementary
    }
  }

  // 5. Deduct stock — products table for supermarket items, finished_goods for bakery items
  for (const item of items as Record<string, unknown>[]) {
    const itemId = (item.item_id ?? item.product_id) as string;
    const itemType = (item.item_type ?? item.product_type ?? "product") as string;
    const qty = item.quantity as number;
    if (itemType === "product" && itemId) {
      const { data: p } = await supabase
        .from("products")
        .select("quantity")
        .eq("id", itemId)
        .single();
      if (p) {
        await supabase
          .from("products")
          .update({ quantity: Math.max(0, (p.quantity as number) - qty) })
          .eq("id", itemId);
      }
    } else if (itemType === "finished_good" && itemId) {
      const { data: fg } = await supabase
        .from("finished_goods")
        .select("quantity")
        .eq("id", itemId)
        .single();
      if (fg) {
        await supabase
          .from("finished_goods")
          .update({
            quantity: Math.max(0, (fg.quantity as number) - qty),
            updated_at: new Date().toISOString(),
          })
          .eq("id", itemId);
      }
    }
  }

  return NextResponse.json(
    {
      order,
      receipt_number: receiptNumber,
      business_name: businessName,
      branch_name: branchName,
      cashier_name: cashierName,
    },
    { status: 201 }
  );
}
