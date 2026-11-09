/**
 * Shared bar-sale rules, used by the server (/api/bar/tabs/[id]/items) and by the
 * POS for its instant on-screen stock update, so the two can never disagree.
 */

type ShotFields = { shots_per_bottle?: number | string | null; price_per_shot?: number | string | null };

/**
 * A bar item can be sold by the shot when it has a shot count per bottle and a
 * shot price. (There is no is_shot_item column in the database: this is derived.)
 */
export function isShotItem(item: ShotFields): boolean {
  return Number(item.shots_per_bottle ?? 0) > 1 && Number(item.price_per_shot ?? 0) > 0;
}

export interface BarStock extends ShotFields {
  price_per_bottle: number | string;
  quantity_bottles: number | string;
  shots_remaining?: number | string | null;
}

/**
 * Price and new stock for selling `qty` of an item as a bottle or a shot.
 * - A shot request on an item that doesn't sell shots is sold as a bottle.
 * - A shot removes 1/shots_per_bottle of a bottle.
 * - A whole bottle of a shot item also removes that bottle's shots.
 */
export function barSale(item: BarStock, qty: number, serveAs: "bottle" | "shot") {
  const sellsShots = isShotItem(item);
  const isShot = serveAs === "shot" && sellsShots;
  const perBottle = Number(item.shots_per_bottle ?? 0);
  const bottles = Number(item.quantity_bottles ?? 0);
  const shots = Number(item.shots_remaining ?? 0);
  const unitPrice = isShot ? Number(item.price_per_shot ?? 0) : Number(item.price_per_bottle ?? 0);

  const enough = isShot ? shots >= qty : bottles >= qty;
  const shortMessage = isShot ? `Only ${shots} shots remaining` : `Only ${bottles} bottles in stock`;

  const update: { quantity_bottles: number; shots_remaining?: number } = isShot
    ? { shots_remaining: shots - qty, quantity_bottles: Math.max(0, bottles - qty / perBottle) }
    : { quantity_bottles: bottles - qty, ...(sellsShots ? { shots_remaining: Math.max(0, shots - qty * perBottle) } : {}) };

  return { isShot, unitPrice, lineTotal: unitPrice * qty, enough, shortMessage, update };
}
