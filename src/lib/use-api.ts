"use client";

import useSWR, { mutate, type SWRConfiguration } from "swr";

/**
 * Data loading with "remember between visits": a page you return to shows its last
 * data immediately while fresh data loads in the background (stale-while-revalidate).
 * The cache lives in this tab's memory only and is cleared on logout
 * (clearApiCache); full page loads (login, PIN switch, lock screen) also reset it.
 */
export async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Request failed: ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export function useApi<T>(url: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(url, jsonFetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 2_000,
    errorRetryCount: 2,
    ...config,
  });
}

/** Forget every cached response (call on logout / account switch). */
export function clearApiCache() {
  return mutate(() => true, undefined, { revalidate: false });
}
