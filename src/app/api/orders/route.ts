import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { generateReceiptNumber } from "@/lib/utils";
import { priceSale, saleItemRef, type SaleItemInput } from "@/lib/sale-pricing";

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

  // Prices and names come from this business's own products and baked items,
  // never from the browser. The browser's total is only used to detect a stale screen.
  const refs = Array.isArray(items) ? (items as SaleItemInput[]).map(saleItemRef) : [];
  const productIds = refs.filter((r) => r?.type === "product").map((r) => r!.id);
  const bakeryIds = refs.filter((r) => r?.type === "finished_good").map((r) => r!.id);
  const [prodRes, fgRes] = await Promise.all([
    productIds.length
      ? supabase.from("products").select("id, name, price").eq("business_id", auth.businessId).in("id", productIds)
      : Promise.resolve({ data: [] as { id: string; name: string; price: number }[] }),
    bakeryIds.length
      ? supabase.from("finished_goods").select("id, name, selling_price").eq("business_id", auth.businessId).in("id", bakeryIds)
      : Promise.resolve({ data: [] as { id: string; name: string; selling_price: number }[] }),
  ]);
  const priced = priceSale(items, {
    product: new Map((prodRes.data ?? []).map((p) => [p.id, { id: p.id, name: p.name, price: Number(p.price) }])),
    finished_good: new Map((fgRes.data ?? []).map((g) => [g.id, { id: g.id, name: g.name, price: Number(g.selling_price) }])),
  }, body.discount_amount ?? body.discount ?? 0);
  if (!priced.ok) return NextResponse.json({ error: priced.error }, { status: priced.status });

  const clientTotal = Number(body.total_amount ?? body.total);
  if (Number.isFinite(clientTotal) && Math.abs(clientTotal - priced.total) > 1) {
    return NextResponse.json(
      { error: "Prices changed since this screen was loaded. Refresh and try again.", code: "price_changed", total: priced.total },
      { status: 409 }
    );
  }
  const discountAmt = priced.discount;
  const totalAmt = priced.total;
  const pricedSubtotal = priced.subtotal;
  void subtotal; // the browser's subtotal is not trusted

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
      subtotal: pricedSubtotal,
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
  const orderItems = priced.lines.map((line) => ({ order_id: order.id, ...line }));

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

  // 5. Deduct stock in one database step per item, checked against this business
  //    (two tills selling the same item at once can no longer overwrite each other).
  for (const line of priced.lines) {
    const fn = line.item_type === "finished_good" ? "adjust_finished_good_stock" : "adjust_product_stock";
    const { error: stockError } = await supabase.rpc(fn, { p_id: line.item_id, p_business: auth.businessId, p_delta: -line.quantity });
    if (stockError) console.error("[orders] stock update failed:", line.item_name, stockError.message);
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
