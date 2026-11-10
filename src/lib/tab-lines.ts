/**
 * A tab keeps one order_items row per "Add to Tab" so the kitchen and bar displays
 * still see each new order as it arrives. For the cart, the customer display and
 * the receipt, rows for the same item at the same price (and the same way of
 * serving: shot vs bottle) are shown as one line with the quantities added up.
 */

export interface TabRow {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type?: string;
  notes?: string | null;
  serve_as?: "bottle" | "shot";
}

export function isShotRow(row: Pick<TabRow, "notes" | "serve_as">): boolean {
  return row.serve_as === "shot" || row.notes === "served as shot";
}

export function groupTabLines<T extends TabRow>(rows: T[]): (T & { ids: string[] })[] {
  const lines = new Map<string, T & { ids: string[] }>();
  for (const row of rows) {
    const shot = isShotRow(row);
    const key = [row.item_type ?? "", row.item_name.trim().toLowerCase(), shot ? "shot" : "", Number(row.unit_price)].join("|");
    const line = lines.get(key);
    if (line) {
      line.quantity = Number(line.quantity) + Number(row.quantity);
      line.total_price = Number(line.total_price) + Number(row.total_price);
      line.ids.push(row.id);
    } else {
      lines.set(key, {
        ...row,
        quantity: Number(row.quantity),
        total_price: Number(row.total_price),
        serve_as: shot ? "shot" : "bottle",
        ids: [row.id],
      });
    }
  }
  return Array.from(lines.values());
}
