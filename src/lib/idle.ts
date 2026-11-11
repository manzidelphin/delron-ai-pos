/** Owners and managers are signed out after this long without activity. */
export const IDLE_SIGN_OUT_MS = 30 * 60 * 1000;
/** A warning with a "Stay signed in" button shows this long before. */
export const IDLE_WARNING_MS = 2 * 60 * 1000;

export type IdleState =
  | { kind: "active" }
  | { kind: "warning"; secondsLeft: number }
  | { kind: "expired" };

/** Where the user stands, given the time of their last activity. */
export function idleState(now: number, lastActivity: number): IdleState {
  const idle = Math.max(0, now - lastActivity);
  if (idle >= IDLE_SIGN_OUT_MS) return { kind: "expired" };
  if (idle >= IDLE_SIGN_OUT_MS - IDLE_WARNING_MS) {
    return { kind: "warning", secondsLeft: Math.ceil((IDLE_SIGN_OUT_MS - idle) / 1000) };
  }
  return { kind: "active" };
}
