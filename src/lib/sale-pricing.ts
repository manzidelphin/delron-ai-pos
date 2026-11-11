/**
 * Prices a counter sale (supermarket / bakery) from the database, not from what
 * the browser sent. The POS sends item ids and quantities; prices and names come
 * from the business's own products and baked items.
 */

export type SaleItemType = "product" | "finished_good";

export interface SaleItemInput {
  item_id?: string;
  product_id?: string;
  item_type?: string;
  product_type?: string;
  quantity?: number | string;
  notes?: string | null;
}

export interface CatalogItem {
  id: string;
  name: string;
  price: number;
}

export interface PricedLine {
  item_id: string;
  item_type: SaleItemType;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

export type PriceResult =
  | { ok: true; lines: PricedLine[]; subtotal: number; discount: number; total: number }
  | { ok: false; status: number; error: string };

export function saleItemRef(item: SaleItemInput): { id: string; type: SaleItemType } | null {
  const id = String(item.item_id ?? item.product_id ?? "").trim();
  const rawType = String(item.item_type ?? item.product_type ?? "product");
  if (!id || (rawType !== "product" && rawType !== "finished_good")) return null;
  return { id, type: rawType };
}

export function priceSale(
  items: SaleItemInput[],
  catalog: { product: Map<string, CatalogItem>; finished_good: Map<string, CatalogItem> },
  requestedDiscount: number
): PriceResult {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, status: 400, error: "No items in order" };

  const lines: PricedLine[] = [];
  for (const raw of items) {
    const ref = saleItemRef(raw);
    if (!ref) return { ok: false, status: 400, error: "An item in the cart is not a product or baked item" };
    const qty = Number(raw.quantity);
    if (!Number.isFinite(qty) || qty <= 0) return { ok: false, status: 400, error: "Every item needs a quantity above 0" };

    const found = catalog[ref.type].get(ref.id);
    if (!found) return { ok: false, status: 400, error: "An item in the cart was not found in this business. Refresh and try again." };

    const unit = Number(found.price) || 0;
    lines.push({
      item_id: ref.id,
      item_type: ref.type,
      item_name: found.name,
      quantity: qty,
      unit_price: unit,
      total_price: Math.round(unit * qty),
      notes: raw.notes ?? null,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.total_price, 0);
  const discount = Math.min(Math.max(0, Math.round(Number(requestedDiscount) || 0)), subtotal);
  return { ok: true, lines, subtotal, discount, total: subtotal - discount };
}
