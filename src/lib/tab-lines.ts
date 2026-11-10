/**
 * A tab keeps one order_items row per "Add to Tab" so the kitchen and bar displays
 * still see each new order as it arrives. For the cart, the customer display and
 * the receipt, rows for the same item at the same price and serving size
 * (single / double / quarter / bottle) are shown as one line with the quantities added up.
 */
import { normalizeServe, serveFromNotes, SERVE_LABELS, type ServeSize } from "@/lib/bar";

export interface TabRow {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type?: string;
  notes?: string | null;
  serve_as?: string;
}

/** Serving size of a row: saved in notes; serve_as is only set on rows built in the browser. */
export function rowServe(row: Pick<TabRow, "notes" | "serve_as">): ServeSize {
  const fromField = normalizeServe(row.serve_as);
  return fromField !== "bottle" ? fromField : serveFromNotes(row.notes);
}

/** " (single)", " (double)", " (quarter)" for poured drinks; nothing for bottles and food. */
export function serveSuffix(row: Pick<TabRow, "notes" | "serve_as">): string {
  const size = rowServe(row);
  return size === "bottle" ? "" : ` (${SERVE_LABELS[size].toLowerCase()})`;
}

export function groupTabLines<T extends TabRow>(rows: T[]): (T & { ids: string[] })[] {
  const lines = new Map<string, T & { ids: string[] }>();
  for (const row of rows) {
    const size = rowServe(row);
    const key = [row.item_type ?? "", row.item_name.trim().toLowerCase(), size, Number(row.unit_price)].join("|");
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
        serve_as: size,
        ids: [row.id],
      });
    }
  }
  return Array.from(lines.values());
}
