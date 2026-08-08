/**
 * Tab identity for the trainer client file.
 *
 * Ported from `v1: src/app/clients/[id]/page.tsx:687-693` (tab
 * order) and `:190` (`useState(() => searchParams.get('tab') || 'overview')`).
 * v1 does not validate the param — a garbage `?tab=` leaves every panel blank,
 * so v2 resolves unknown values to the default instead.
 */

export const CLIENT_TABS = [
  "overview",
  "program",
  "progress",
  "messages",
  "payments",
] as const;

export type ClientTab = (typeof CLIENT_TABS)[number];

export const DEFAULT_CLIENT_TAB: ClientTab = "overview";

export const CLIENT_TAB_LABELS: Record<ClientTab, string> = {
  overview: "Overview",
  program: "Program",
  progress: "Progress",
  messages: "Messages",
  payments: "Payments",
};

/** Resolve a raw `?tab=` value to a real tab, defaulting to Overview. */
export function resolveTab(raw: string | null | undefined): ClientTab {
  if (!raw) return DEFAULT_CLIENT_TAB;
  return (CLIENT_TABS as readonly string[]).includes(raw)
    ? (raw as ClientTab)
    : DEFAULT_CLIENT_TAB;
}
