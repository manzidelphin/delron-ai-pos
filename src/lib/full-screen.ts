// Working screens that fill the content area exactly (no page padding or scroll):
// POS terminals and the kitchen display. They use h-full and scroll internally.
const FULL_SCREEN_ROUTES = ["/bar/pos", "/supermarket/pos", "/restaurant/kds"];

export function isFullScreenRoute(path: string): boolean {
  return FULL_SCREEN_ROUTES.some((r) => path === r || path.startsWith(r + "/"));
}
