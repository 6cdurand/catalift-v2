/**
 * Hydration merge strategy. v1 replaced the whole store on every fetch, which
 * dropped in-flight rows and clobbered fields not present in a partial payload.
 *
 * `mergeById` merges incoming rows into existing rows keyed by `id`:
 *  - incoming wins per-field (deep merge for nested plain objects),
 *  - fields absent from incoming keep their existing value (no clobber),
 *  - existing rows absent from incoming are preserved (no data loss).
 */
export function mergeById<T extends { id: string }>(
  existing: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const row of existing) byId.set(row.id, row);
  for (const row of incoming) {
    const prev = byId.get(row.id);
    byId.set(row.id, prev ? deepMerge(prev, row) : row);
  }
  return Array.from(byId.values());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

/**
 * Deep-merges `patch` onto `base`. Plain objects merge recursively; arrays and
 * primitives are replaced by `patch`. `undefined` values in `patch` are skipped
 * so a partial payload never erases an existing field. `null` is a real value
 * and does overwrite.
 */
function deepMerge<T>(base: T, patch: T): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch;

  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const prev = out[key];
    out[key] =
      isPlainObject(prev) && isPlainObject(value)
        ? deepMerge(prev, value)
        : value;
  }
  return out as T;
}
