/**
 * Shared bar-sale rules, used by the server (/api/bar/tabs/[id]/items), the POS
 * (instant on-screen stock), the bar display and the owner reports, so they can
 * never disagree.
 *
 * A spirit can be served as:
 *   single  – 1 shot         (price_per_shot)
 *   double  – 2 shots        (price_per_double)
 *   quarter – ¼ of a bottle  (price_per_quarter)
 *   bottle  – whole bottle   (price_per_bottle)
 * Stock of spirits is kept in shots (shots_remaining) and bottles (quantity_bottles).
 */

export type ServeSize = "bottle" | "single" | "double" | "quarter";

type ServeFields = {
  shots_per_bottle?: number | string | null;
  price_per_shot?: number | string | null;
  price_per_double?: number | string | null;
  price_per_quarter?: number | string | null;
};

const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;

/**
 * A bar item can be sold in shots when it has a shot count per bottle and a single
 * shot price. (There is no is_shot_item column in the database: this is derived.)
 */
export function isShotItem(item: ServeFields): boolean {
  return num(item.shots_per_bottle) > 1 && num(item.price_per_shot) > 0;
}

/** Sizes the owner has priced for this item, always ending with the whole bottle. */
export function serveOptions(item: ServeFields): ServeSize[] {
  const sizes: ServeSize[] = [];
  if (isShotItem(item)) {
    sizes.push("single");
    if (num(item.price_per_double) > 0) sizes.push("double");
  }
  if (num(item.shots_per_bottle) > 1 && num(item.price_per_quarter) > 0) sizes.push("quarter");
  sizes.push("bottle");
  return sizes;
}

/** Accepts the old "shot" value from older POS screens. */
export function normalizeServe(value: unknown): ServeSize {
  if (value === "shot" || value === "single") return "single";
  if (value === "double" || value === "quarter") return value;
  return "bottle";
}

export const SERVE_LABELS: Record<ServeSize, string> = {
  single: "Single", double: "Double", quarter: "Quarter", bottle: "Bottle",
};

/** Note saved on order_items. "served as shot" is kept for singles so old rows still read right. */
const SERVE_NOTES: Record<ServeSize, string | null> = {
  single: "served as shot",
  double: "served as double shot",
  quarter: "served as quarter bottle",
  bottle: null,
};

export function serveNote(size: ServeSize): string | null {
  return SERVE_NOTES[size];
}

/** Reads the serving size back from an order_items note. */
export function serveFromNotes(notes: string | null | undefined): ServeSize {
  const n = (notes ?? "").toLowerCase();
  if (n.includes("quarter")) return "quarter";
  if (n.includes("double")) return "double";
  if (n.includes("shot")) return "single";
  return "bottle";
}

/** Shots poured for one serving of this size. */
export function shotsPerServe(size: ServeSize, shotsPerBottle: number | string | null | undefined): number {
  const perBottle = num(shotsPerBottle);
  if (size === "single") return 1;
  if (size === "double") return 2;
  if (size === "quarter") return perBottle / 4;
  return perBottle;
}

/** Bottles used by `qty` servings of this size (a whole bottle = 1). */
export function bottlesUsed(size: ServeSize, qty: number, shotsPerBottle: number | string | null | undefined): number {
  if (size === "bottle") return qty;
  const perBottle = num(shotsPerBottle);
  if (perBottle <= 0) return size === "quarter" ? qty / 4 : 0;
  return (qty * shotsPerServe(size, perBottle)) / perBottle;
}

/**
 * Drinks the bartender has to make go to the Bar KDS: cocktails and anything
 * poured (single, double, quarter). Bottles of beer, soft drinks and whole bottles
 * are simply handed over, so they're saved as already served.
 */
export function needsBarPreparation(category: string | null | undefined, poured: boolean): boolean {
  return poured || (category ?? "").trim().toLowerCase() === "cocktail";
}

export interface BarStock extends ServeFields {
  price_per_bottle: number | string;
  quantity_bottles: number | string;
  shots_remaining?: number | string | null;
}

export function servePrice(item: BarStock, size: ServeSize): number {
  if (size === "single") return num(item.price_per_shot);
  if (size === "double") return num(item.price_per_double);
  if (size === "quarter") return num(item.price_per_quarter);
  return num(item.price_per_bottle);
}

/** How many servings of this size the current stock allows. */
export function maxServings(item: BarStock, size: ServeSize): number {
  if (size === "bottle") return Math.floor(num(item.quantity_bottles));
  const per = shotsPerServe(size, item.shots_per_bottle);
  return per > 0 ? Math.floor(num(item.shots_remaining) / per + 1e-9) : 0;
}

/**
 * Price and new stock for selling `qty` servings.
 * - A size the item isn't priced for is sold as a whole bottle.
 * - Poured sizes remove their shots, and the matching part of a bottle.
 * - A whole bottle of a shot item also removes that bottle's shots.
 */
export function barSale(item: BarStock, qty: number, serveAs: ServeSize | "shot") {
  let size = normalizeServe(serveAs);
  if (!serveOptions(item).includes(size)) size = "bottle";

  const isShot = size !== "bottle";
  const perBottle = num(item.shots_per_bottle);
  const bottles = num(item.quantity_bottles);
  const shots = num(item.shots_remaining);
  const unitPrice = servePrice(item, size);
  const shotsUsed = isShot ? qty * shotsPerServe(size, perBottle) : 0;

  const enough = isShot ? shots + 1e-9 >= shotsUsed : bottles >= qty;
  const shortMessage = isShot ? `Only ${shots} shots remaining` : `Only ${bottles} bottles in stock`;
  const round2 = (v: number) => Math.round(v * 100) / 100;

  const update: { quantity_bottles: number; shots_remaining?: number } = isShot
    ? { shots_remaining: round2(shots - shotsUsed), quantity_bottles: round2(Math.max(0, bottles - shotsUsed / perBottle)) }
    : { quantity_bottles: round2(bottles - qty), ...(isShotItem(item) || perBottle > 1 ? { shots_remaining: Math.max(0, shots - qty * perBottle) } : {}) };

  return { size, isShot, unitPrice, lineTotal: unitPrice * qty, enough, shortMessage, update, note: serveNote(size) };
}
