# w6b — Exercise Library Dedup Audit

## Summary

Additive-only dedup pass on `src/lib/exercises.ts`. No IDs renamed or deleted.

## Changes

- **`src/types/index.ts`**: Added `aliases?`, `alternatives?`, `unilateralVariantId?` to `Exercise` interface
- **`src/lib/exercises.ts`**: Added aliases (25 exercises), alternatives links (37 exercises, 19 symmetric pairs), unilateralVariantId (4 bilateral→unilateral links)
- **`scripts/audit-exercises.mjs`**: New verifier script checking INV-1 through INV-5
- **`package.json`**: Added `audit:exercises` npm script
- **`src/lib/exercises.audit.md`**: Full audit report with proposed merges flagged for sign-off

## Invariants Verified

- INV-1: No duplicate ids within any single array (16 cross-array repeats are expected)
- INV-2: All alternatives/unilateralVariantId resolve to existing ids
- INV-3: No alias↔id/name collisions
- INV-4: All alternatives links are symmetric
- INV-5: Summary counts reported

## What Was NOT Done

- No existing `exercise_id` renamed or deleted (cardinal rule)
- No merges applied — 5 proposed merges flagged in audit report for human sign-off
- `src/features/programs/**` not touched (another lane owns it)
