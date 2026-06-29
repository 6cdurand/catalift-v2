# .pipeline/programs-w2c2-block-library/spec.md — Stage 1 (PLAN)

**Box:** 02-programs · **Wave:** w2c-2 · **Feature:** Program Builder — **Block Library** (reusable blocks + folders) + **Save-Block-to-Library**
**Class:** A — UI + writes to a saved-blocks table via existing RLS. **Schema check required** (see §H).
**Executor model:** GLM 5.2 · **Recommended executor:** v2 Cascade (reads v1 directly).
**Repo:** catalift-v2 · **Branch:** `programs-w2c2-block-library` · ONE PR.
**Priority:** LOWER than w2c-1 — the builder is fully functional (build → schedule → save) WITHOUT this.
This is a power-user convenience (save a block once, reuse it). Build after w2c-1.
**Depends on:** w2b-1 merged (blocks/exercises exist) + w2c-1 ideally merged (clean builder base).

---

## SOURCE — v1 code to port (read directly; FALLBACK: ask Christo to paste)
> `/Users/christofit7/Desktop/catalift/catalift-web/apex-fitness/src/app/program/builder/page.tsx`
> - **Block Library dialog JSX:** **L1610–L1869** (saved-block list, folder filter, add-from-library,
>   move/delete block).
> - **Save-Block-to-Library dialog JSX:** **L2271–L2421**.
> - **Handlers/state:** `addBlockFromLibrary` L640; `filteredLibraryBlocks` L621; folder list L612;
>   `showSaveBlockDialog` L421; store calls (L254): `savedBlocks`, `deleteBlock`, `updateBlock`,
>   `renameBlockFolder`, `deleteBlockFolder`, `refreshBlockLibrary`, `saveProgramAsTemplate`.
> - **Folder dialog components (separate files in v1):**
>   `/catalift-web/apex-fitness/src/components/program/CreateFolderDialog.tsx`,
>   `RenameFolderDialog.tsx`, `DeleteFolderDialog.tsx` — port these too.

**NOT in scope:** Schedule/Save/Activate (w2c-1); Exercise-Edit dialog (w2b-2); program *templates*
(whole-program save/select) — that's **w4** (`SaveProgramDialog` + template select/preview), distinct from
saving a single BLOCK to the library here.

---

## H. ⚠️ Schema check FIRST (do this before coding)
v1 saves blocks via `useTrainerStore` to a saved-blocks table. **Confirm the v2 backend has a table for
reusable blocks + folders.** w1 shipped `saved_programs` + `client_programs` (migration 00007) — those are
PROGRAMS, not blocks. If there is **no saved-blocks table**, this becomes **Class B** (needs a migration +
RLS) → STOP and report to Christo; command-center authors the migration spec before w2c-2 proceeds.
Do NOT invent a table or write blocks into `saved_programs`.

---

# ===== FEATURE READINESS GATE (A–F) =====

## A. Placement
Modal dialogs layered over Step 2 "Build Days": "Block Library" (browse/insert saved blocks) and
"Save Block to Library" (save the current block). Shared library scoped to the authoring user/trainer.

## B. Navigation map
| Element | Leads to | Type | Back |
|---|---|---|---|
| Step 2 "Block Library" | Block-Library dialog | popup | Close → Step 2 |
| Library: folder filter | filters list | inline | n/a |
| Library: "Add" on a saved block | inserts block into the active day | inline → closes | n/a |
| Library: move/delete block | mutates saved blocks | inline | n/a |
| Library: create/rename/delete folder | folder dialogs | popup | back → Library |
| Step 2 block "Save to Library" | Save-Block dialog | popup | Save/Cancel → Step 2 |
- **Dead-end check:** every dialog Close/Cancel → parent; folder dialogs → Library.

## C. Two-sided view
Authoring convenience; identical in self + trainer modes. No recipient view.

## D. Functionality walkthrough
User saves a built block ("Push Day A") to a folder → later, in another program, opens Block Library,
filters by folder, taps Add → the block + its exercises insert into the active day (port `addBlockFromLibrary`
L640). Can rename/delete folders and move/delete blocks. Empty library = "no saved blocks yet".

## E. Data + source-of-truth
- Reads/writes the saved-blocks table via a v2 store/api (NEW if missing — see §H). NO second program
  store (G-16). Inserting a library block goes through the w1 days mutators (w2b-1).
- Parity: no next-day logic here.

## F. Acceptance gate
1. Save a block to a (new/existing) folder → row persists; reappears after reload.
2. Add-from-library inserts the block + exercises into the active day via the store.
3. Folder create/rename/delete works; blocks move between folders; delete removes a block.
4. Library is correctly scoped (RLS) to the user — no cross-user blocks leak.
5. grep-guards (§L) = 0; port-fidelity.
- **exercise-specialist lens:** inserted blocks preserve structure (sets/reps/grouping).
- **VERDICT:** READY **only if §H confirms a saved-blocks table exists**; otherwise PARKED pending migration.

# ===== END GATE =====

---

## J. v2 implementation (target structure)
```
src/features/programs/builder/dialogs/BlockLibraryDialog.tsx     # NEW
src/features/programs/builder/dialogs/SaveBlockDialog.tsx        # NEW
src/features/programs/builder/dialogs/folders/{Create,Rename,Delete}FolderDialog.tsx  # NEW (port v1)
src/features/programs/api/blocks.ts   # NEW: list/save/update/delete saved blocks + folders (if table exists)
src/features/programs/store.ts        # add saved-blocks slice (list/refresh) + addBlockFromLibrary wiring
```

## K. Guardrails (PR proof block)
```
[ ] §H done — saved-blocks table CONFIRMED (or PR parked + migration requested); blocks NOT written into saved_programs
[ ] RLS — saved-blocks reads/writes are user-scoped (verify policy); no cross-user leak
[ ] G-11 — block save/delete/folder ops use await + retry
[ ] G-16 — no 2nd program store; dialogs are focused files
[ ] G-10 real uuids; no stub ids
[ ] no localStorage persistence; no canonical_user_id; no apex-
[ ] PORT-UI fidelity — matches v1 library/folder UI
[ ] tsc + lint + vitest + e2e green (verify the GitHub check-run conclusion)
```

## L. Tests (→ tests.md)
- Unit: save block → list includes it; addBlockFromLibrary inserts into active day; folder rename/delete updates list.
- grep-guards (0): `grep -rn "stub-user-id\|canonical_user_id\|apex-" src/features/programs`; no 2nd store.
- e2e: save a block → reopen library → add it to a new day → exercises present.

## M. Hand-off checklist
- [x] Stage 1 PLAN — this file.
- [ ] §H schema check — saved-blocks table exists? (gates Class A vs Class B).
- [ ] Blocked until w2c-1 merged (clean base).
- [ ] Code / Test (v2 Cascade, GLM 5.2) → PR → Review.
- [ ] Builder series COMPLETE after this (then w3 client program page, w4 templates).

## N. Christo's paste-ready prompt (after w2c-1 merged)
> Set the v2 Cascade to **GLM 5.2**. Read `.pipeline/programs-w2c2-block-library/spec.md` and the v1 source
> it cites (read directly; if blocked, stop and tell me). FIRST do §H: confirm v2 has a saved-blocks table
> with user-scoped RLS — if it does NOT, STOP and report (this becomes Class B, needs a migration). If it
> exists, port the Block-Library + Save-Block + folder dialogs onto a v2 blocks api/store. PORT-UI fidelity.
> Branch `programs-w2c2-block-library`, ONE PR, fill the proof block, return REPORT-BACK. One objective; GLM 5.2.
