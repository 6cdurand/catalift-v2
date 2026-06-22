# Design lane — src/components/

> Rules for any work on shared UI. Read this before touching components/.
> Global rules in /AGENTS.md still apply.

## What lives here
- `ui/`       → shadcn primitives, PORTED verbatim from v1 (sky/rose themed)
- `layouts/`  → MainLayout, PageHeader (the app shell)
- `shell/`    → nav config / tab bar pieces
- `states/`   → empty/loading/error states
Feature-specific components live in `src/features/<domain>/components/`, NOT here.

## The Catalift visual identity (do NOT redesign — match v1)
- **Light mode.** White background, gray-900 text. No dark theme.
- **Mode-themed accents:** client/athlete = **sky** (sky-500/400), trainer = **rose** (rose-500/400).
  The whole UI recolors on `user.mode`.
- **Radius:** 10px default (`rounded-[10px]`), tokens sm6/md10/lg14/xl20/2xl24.
- **Font:** Inter.
- **Logo:** CataliftLogo — sky→orange gradient, tagline "Ignite Your Rise".

## Rules
1. **Port, don't invent.** When bringing a component from v1, copy it verbatim and change ONLY the
   data source. Never rebuild a "design system" or swap the look. (Guardrail G-19.)
2. **No cross-feature imports.** Shared components import only from `lib/`, `utils/`, other `components/`.
   They must NOT import from `src/features/*`.
3. **No business logic in components.** Presentational only; data comes in via props/hooks.
4. **Accessibility:** every icon-only button needs `aria-label`; interactive elements keyboard-reachable.
5. **Tailwind only** (v4) — no inline style objects except dynamic values (e.g. background image URL).

## Before you finish
- `npx tsc --noEmit` clean · `npm run lint` clean (import-boundary check included).
- If UI-facing, a Playwright smoke still passes (see tests/AGENTS.md).
