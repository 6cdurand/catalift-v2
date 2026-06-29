/**
 * Unified exercise search — one entry point used by every exercise picker
 * in the app (active workout, program builder, workout builder).
 *
 * Typo tolerance comes from `fuse.js`; semantic synonyms come from
 * `exerciseAliases.ts`. There is intentionally only one Fuse index, so
 * every surface that calls `searchExercises(query, opts)` gets identical
 * ranked results for the same `(query, opts)` pair.
 *
 * Acceptance (BACKLOG.md P0):
 *  - identical results in active workout + builders for any query;
 *  - "cheast prese" returns a bench-press variant in the top 3;
 *  - "db row" returns "Dumbbell Row" first.
 */
import Fuse, { type IFuseOptions } from 'fuse.js';
import { Exercise, ExerciseCategory } from '@/types';
import { allExercises } from './exercises';
import { EXERCISE_ALIASES } from './exerciseAliases';

export type ExerciseBlockType = 'warmup' | 'work' | 'strength' | 'circuit' | 'cardio' | 'cooldown';

export interface SearchOptions {
  /** Cap on returned results. Omit for no cap. */
  limit?: number;
  /**
   * Block type filter. Matches the semantics used by the builders:
   *  - "warmup": warmup / stretching / activation
   *  - "cooldown": stretching
   *  - "cardio": cardio
   *  - "circuit": anything except warmup / stretching / activation
   *  - "work" / "strength" (default): compound / isolation only
   */
  blockType?: ExerciseBlockType | string | null;
  /** Only return exercises whose `category` is in this list. */
  categories?: ExerciseCategory[];
  /** Extra exercises (e.g. user-custom) to include in the search pool. */
  extraExercises?: Exercise[];
}

// ── Block-type filter (mirrors filterExercisesBySearch in exercises.ts) ──
function matchesBlockType(ex: Exercise, blockType: SearchOptions['blockType']): boolean {
  if (!blockType) return true;
  const category = (ex.category || '').toLowerCase();
  switch (blockType) {
    case 'warmup':
      return category === 'warmup' || category === 'stretching' || category === 'activation';
    case 'cooldown':
      return category === 'stretching';
    case 'cardio':
      return category === 'cardio';
    case 'circuit':
      return category !== 'warmup' && category !== 'stretching' && category !== 'activation';
    case 'work':
    case 'strength':
    default:
      return (
        category !== 'warmup' &&
        category !== 'cardio' &&
        category !== 'stretching' &&
        category !== 'activation'
      );
  }
}

// ── Index record shape ──────────────────────────────────────
interface ExerciseIndexRecord {
  exercise: Exercise;
  name: string;
  aliases: string[];
  primaryMuscle: string;
  secondaryMuscles: string;
  equipment: string;
}

function toIndexRecord(ex: Exercise): ExerciseIndexRecord {
  return {
    exercise: ex,
    name: ex.name,
    aliases: EXERCISE_ALIASES[ex.id] ?? [],
    primaryMuscle: ex.primaryMuscles?.[0] ?? '',
    secondaryMuscles: (ex.secondaryMuscles ?? []).join(' '),
    equipment: ex.equipment ?? '',
  };
}

const FUSE_OPTIONS: IFuseOptions<ExerciseIndexRecord> = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'aliases', weight: 0.2 },
    { name: 'primaryMuscle', weight: 0.05 },
    { name: 'secondaryMuscles', weight: 0.025 },
    { name: 'equipment', weight: 0.025 },
  ],
  threshold: 0.3,
  ignoreLocation: false,
  distance: 200,
  includeScore: true,
  minMatchCharLength: 2,
};

// ── Deterministic fast-path ranking ─────────────────────────
// Tier 0 = exact name match (case-insensitive)
// Tier 1 = alias exact match (explicit synonym — stronger than prefix)
// Tier 2 = name starts with query (prefix)
// Tier 3 = name or alias contains query (substring)
const EXACT = 0;
const ALIAS_EXACT = 1;
const PREFIX = 2;
const SUBSTRING = 3;

function deterministicRank(rec: ExerciseIndexRecord, q: string): number | null {
  const nameLower = rec.name.toLowerCase();
  const qLower = q.toLowerCase();

  if (nameLower === qLower) return EXACT;

  for (const alias of rec.aliases) {
    if (alias.toLowerCase() === qLower) return ALIAS_EXACT;
  }

  if (nameLower.startsWith(qLower)) return PREFIX;

  if (nameLower.includes(qLower)) return SUBSTRING;
  for (const alias of rec.aliases) {
    if (alias.toLowerCase().includes(qLower)) return SUBSTRING;
  }

  return null;
}

// ── Cached Fuse index for the base pool (no extras) ─────────
let baseFuse: Fuse<ExerciseIndexRecord> | null = null;
let baseRecords: ExerciseIndexRecord[] | null = null;

function getBaseFuse(): Fuse<ExerciseIndexRecord> {
  if (!baseFuse) {
    baseRecords = allExercises.map(toIndexRecord);
    baseFuse = new Fuse(baseRecords, FUSE_OPTIONS);
  }
  return baseFuse;
}

function buildFuse(extras: Exercise[]): { fuse: Fuse<ExerciseIndexRecord>; records: ExerciseIndexRecord[] } {
  const records = [...allExercises, ...extras].map(toIndexRecord);
  return { fuse: new Fuse(records, FUSE_OPTIONS), records };
}

/**
 * Search the exercise library. Empty query returns the full (optionally
 * filtered) pool in library order; non-empty query returns ranked results
 * where exact/prefix/alias/substring matches always appear first, followed
 * by fuzzy (typo-tolerant) matches with a tight threshold.
 */
export function searchExercises(query: string, opts: SearchOptions = {}): Exercise[] {
  const { limit, blockType, categories, extraExercises } = opts;
  const trimmed = (query || '').trim();

  const hasExtras = !!extraExercises && extraExercises.length > 0;
  let pool: Exercise[];
  let results: Exercise[];

  if (!trimmed) {
    pool = hasExtras ? [...allExercises, ...extraExercises!] : allExercises;
    results = pool;
  } else {
    // Build the record pool for deterministic matching
    const records: ExerciseIndexRecord[] = hasExtras
      ? [...allExercises, ...extraExercises!].map(toIndexRecord)
      : (baseRecords ?? (baseRecords = allExercises.map(toIndexRecord)));

    // Phase 1: deterministic matches (exact > alias-exact > prefix > substring)
    const seen = new Set<string>();
    const detByTier: ExerciseIndexRecord[][] = [[], [], [], []];
    for (const rec of records) {
      const tier = deterministicRank(rec, trimmed);
      if (tier !== null) {
        detByTier[tier].push(rec);
        seen.add(rec.exercise.id);
      }
    }
    const deterministic: Exercise[] = [
      ...detByTier[EXACT],
      ...detByTier[ALIAS_EXACT],
      ...detByTier[PREFIX],
      ...detByTier[SUBSTRING],
    ].map(r => r.exercise);

    // Phase 2: fuzzy matches (typo tolerance) — only items not already found
    let fuzzy: Exercise[] = [];
    if (hasExtras) {
      const { fuse } = buildFuse(extraExercises!);
      fuzzy = fuse.search(trimmed)
        .filter(r => !seen.has(r.item.exercise.id))
        .map(r => r.item.exercise);
    } else {
      const fuse = getBaseFuse();
      fuzzy = fuse.search(trimmed)
        .filter(r => !seen.has(r.item.exercise.id))
        .map(r => r.item.exercise);
    }

    results = [...deterministic, ...fuzzy];
  }

  if (blockType) results = results.filter(ex => matchesBlockType(ex, blockType));
  if (categories && categories.length) {
    const set = new Set(categories);
    results = results.filter(ex => set.has(ex.category));
  }
  if (typeof limit === 'number' && limit >= 0) results = results.slice(0, limit);

  return results;
}

/**
 * Convenience: search and project to the lite `{id, name, pattern}` shape
 * used by the program / workout builder exercise pickers. `pattern` is
 * derived from the exercise category so existing callers keep working.
 */
export function searchExercisesLite(
  query: string,
  opts: SearchOptions = {},
): Array<{ id: string; name: string; pattern: string; aliases: string[]; isCustom?: boolean }> {
  return searchExercises(query, opts).map(ex => ({
    id: ex.id,
    name: ex.name,
    pattern: ex.category,
    aliases: EXERCISE_ALIASES[ex.id] ?? [],
    isCustom: ex.isCustom,
  }));
}

/** Reset the cached Fuse index. Intended for tests only. */
export function __resetSearchCacheForTests(): void {
  baseFuse = null;
  baseRecords = null;
}
