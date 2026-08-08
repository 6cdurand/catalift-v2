/** Shared formatters for the client-file panels (moved out of page.tsx unchanged). */

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatVolume(vol: number): string {
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k kg`;
  return `${vol} kg`;
}
