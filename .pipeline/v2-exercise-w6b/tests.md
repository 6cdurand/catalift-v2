# w6b — Test Plan

## Verifier Script

`npm run audit:exercises` — checks 5 invariants:

| ID | Check | Status |
|---|---|---|
| INV-1 | No duplicate ids within any single array | PASS |
| INV-2 | All alternatives/unilateralVariantId resolve to existing ids | PASS |
| INV-3 | No alias collides with another exercise's id or primary name | PASS |
| INV-4 | All alternatives links are symmetric | PASS |
| INV-5 | Summary count report | PASS |

## Type Safety

- `npx tsc --noEmit` — 0 errors

## Lint

- `npm run lint` — 0 errors (pre-existing warnings only)

## Unit Tests

- `npm run test:unit` — 22 files, 190 tests, all pass

## E2E

- Not applicable (data-only changes, no UI touched)
