---
name: create-feature
description: Scaffolds a new feature folder with all subfolders, types.ts, index.ts, and __tests__ directory. Use when creating a new domain feature.
---

# Create Feature

When asked to create a new feature, scaffold the full structure:

## Steps

1. **Create the feature directory:** `src/features/<feature-name>/`

2. **Create subdirectories with .gitkeep:**
   - `api/` — Supabase API calls for this feature
   - `components/` — React components for this feature
   - `hooks/` — React hooks for this feature
   - `lib/` — utility functions for this feature (if needed)
   - `stores/` — Zustand stores for this feature
   - `__tests__/` — co-located tests

3. **Create `types.ts`:**
   ```typescript
   // <feature-name> feature types
   export interface <FeatureName>Item {
     id: string;
     // ... fields
   }
   ```

4. **Create `index.ts` (barrel export):**
   ```typescript
   export * from './types';
   // export hooks, components, etc. as they're created
   ```

5. **Create `AGENTS.md`** with feature-specific rules (see existing features for examples).

6. **Verify:** `npx tsc --noEmit` passes with the new structure.

## Naming conventions

- Feature folder: `kebab-case` (e.g., `workout-engine`, `trainer-ops`)
- Types: `PascalCase` (e.g., `WorkoutSet`, `ClientProfile`)
- Hooks: `use-kebab-case` (e.g., `use-workout-session`)
- Components: `PascalCase` (e.g., `ExercisePopup`, `SetLogger`)
