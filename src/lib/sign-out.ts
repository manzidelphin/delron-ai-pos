import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import { clearApiCache } from "@/lib/use-api";

/** Shared between tabs: last time the signed-in owner/manager did something. */
export const ACTIVITY_KEY = "delron_last_activity";

/**
 * Full sign-out used by the Log out button and the idle timer:
 * clears the PIN-operator cookie (or the next person on this device would be
 * treated as that operator), ends the session, and wipes cached figures.
 */
export async function signOutEverywhere() {
  await fetch("/api/auth/pin-login", { method: "DELETE" }).catch(() => {});
  await createClient().auth.signOut();
  useAuthStore.getState().reset();
  await clearApiCache(); // never show this business's cached figures to the next user
  try { localStorage.removeItem(ACTIVITY_KEY); } catch { /* storage blocked */ }
}
