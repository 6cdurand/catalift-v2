// sessionStorage persistence for the Today day-selector's selected date.
//
// v1 parity (v1 today page, `src/app/today/page.tsx:65-79`): the selected day
// survives navigating away and back within the tab, and is NOT remembered
// across a browser session. v1 stored an ISO *timestamp* under the bare key
// `today-selected-date`; v2 stores the ISO *date* (the only thing the strip
// needs) under a USER-SCOPED key, per the repo invariant that no cache key may
// be shared across accounts (AGENTS.md #4). The resource name is still
// `today-selected-date`, so the key reads
// `catalift-today-selected-date-<userId>`.
//
// Every access is guarded: no `window` on the server, and Safari private mode
// throws on sessionStorage access rather than returning null.

import { toISODate, parseISODate } from "@/lib/week";

/** Resource name passed to userScopedKey — v1's key, now scoped. */
export const SELECTED_DATE_RESOURCE = "today-selected-date";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when `value` is a real calendar date in ISO YYYY-MM-DD form.
 * Round-trips through the shared week helpers, so "2026-02-31" is rejected
 * (Date rolls it to March 3 and the round-trip no longer matches).
 */
export function isISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = parseISODate(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return toISODate(parsed) === value;
}

/**
 * The stored selected date, or null when there is nothing valid to restore.
 * A stored date OUTSIDE the current week is still honoured (v1 behaviour) —
 * the visible week is derived from the selection, not the other way round.
 */
export function readSelectedDate(key: string): string | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    const saved = window.sessionStorage.getItem(key);
    if (!saved || !isISODate(saved)) return null;
    return saved;
  } catch {
    return null;
  }
}

/**
 * useSyncExternalStore subscribe fn. sessionStorage does not fire `storage` in
 * the tab that wrote it, so this only picks up another tab clearing the value —
 * in-tab changes flow through React state. Its job is mainly to give
 * useSyncExternalStore a valid subscription so the read stays out of render.
 */
export function subscribeToSelectedDate(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Best-effort persist — a storage failure must never break the page. */
export function writeSelectedDate(key: string, iso: string): void {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.setItem(key, iso);
  } catch {
    // Private-mode / quota — the selection simply won't survive navigation.
  }
}
