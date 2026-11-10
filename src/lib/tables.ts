/** Smallest table number (1, 2, 3…) not used by a table that is still on the floor. */
export function nextTableNumber(active: { table_number: string | number | null }[]): number {
  const used = new Set(active.map((t) => parseInt(String(t.table_number ?? ""), 10)).filter((n) => n > 0));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}
