# .pipeline/programs-w2a-builder-setup/spec.md — Programs w2a: builder wizard skeleton + Step 1 (Setup)

**Class:** A (UI port onto the w1 programs data layer; no schema change, no auth change). **Model:** GLM 5.2.
**Branch from:** main → `programs-w2a-builder-skeleton-setup`. Push branch; conductor opens the PR.
Sub-wave 1 of 3 (w2a/w2b/w2c). Full feature gate (A–F) lives in command-center `domains/02-programs/pipeline/w2/spec.md`.

## What w2a delivers (and ONLY this)
1. Builder feature folder + wizard SHELL with 3-step progress UI (Setup · Build Days · Schedule) + step
   state (`builderStep`), rendered at the existing route `src/app/program/builder/page.tsx`.
2. STEP 1 "Setup" fully working: program name, (trainer-mode) client select, goal, phase, duration
   (+ custom weeks), days/week, auto-repeat, and "Continue to Build Days" validation + transition.
3. Setup state wired to the w1 programs types/store (NOT v1's god stores).
4. STEP 2 + STEP 3 are PLACEHOLDERS ("Build Days — w2b" / "Schedule — w2c") so the wizard renders
   end-to-end. Do NOT build days/exercise/schedule/dialogs here.

**NOT in w2a:** WorkoutDayBuilder, Add-Exercise, Exercise-Edit, Block Library, Save/Activate, assign.

## Port-fidelity (critical — PR #2 lesson, guardrail G-19)
PORT v1's ACTUAL Setup UI below — same fields, order, options, validation, flow. Do NOT invent a generic
shadcn form. Adapt ONLY: (a) re-seam data from v1 stores → w1 programs store/types; (b) use v2's existing
component library + theme tokens (v2 is NOT the v1 dark theme — match existing v2 pages e.g. workout/active,
don't hardcode v1's bg-gray-900). Structure/fields/labels/options/validation identical to v1.

## v1 source to PORT (actual code — you cannot read the v1 repo)
```tsx
// v1: apex-fitness/src/app/program/builder/page.tsx

// --- shell ---
export default function ProgramBuilderPage() {
  return (<Suspense fallback={<BuilderLoading />}><ProgramBuilderContent /></Suspense>);
}

function ProgramBuilderContent() {
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get('clientId');
  const templateIdParam = searchParams.get('templateId'); // w4 handles template prefill; w2a may ignore
  const isTrainerMode = /* v2: derive from session/profile mode — see notes */;

  // ── Setup state ──
  const [builderStep, setBuilderStep] = useState<'setup'|'days'|'schedule'>('setup');
  const [programName, setProgramName] = useState('');
  const [goal, setGoal] = useState<TrainingGoal>('hypertrophy');
  const [phase, setPhase] = useState<TrainingPhase>('strength');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [customWeeks, setCustomWeeks] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [autoRepeat, setAutoRepeat] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientIdParam);
  const actualWeeks = durationWeeks === 0 ? parseInt(customWeeks) || 4 : durationWeeks;

  // initializeDays(): builds empty ProgramDay[] from daysPerWeek using DAY_LABEL_PRESETS + DEFAULT_SCHEDULE.
  // On "Continue": call initializeDays() then setBuilderStep('days'). The days array lands in the w1 store; w2b consumes it.

  // --- progress steps UI ---
  {['Setup','Build Days','Schedule'].map((label, i) => {
    const steps = ['setup','days','schedule'];
    const isActive = steps.indexOf(builderStep) >= i;
    return (<div key={label} className="flex-1 text-center">
      <div className={`h-1 rounded-full mb-1 ${isActive ? 'bg-sky-500' : 'bg-gray-700'}`} />
      <span className={`text-[10px] ${isActive ? 'text-sky-400' : 'text-gray-600'}`}>{label}</span>
    </div>);
  })}

  // --- STEP 1: SETUP (port structure verbatim) ---
  {builderStep === 'setup' && (
    <div className="space-y-4">
      <Card><CardContent className="p-4 space-y-4">
        <Label>Program Name</Label>
        <Input value={programName} onChange={e=>setProgramName(e.target.value)} placeholder="e.g. 8-Week Hypertrophy" />

        {/* Client select — ONLY in trainer mode */}
        {isTrainerMode && (<>
          <Label>Client</Label>
          <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
            {/* options = trainer's clients (Box 4 trainer_clients). Render the picker; if the v2 client
                list source isn't available yet, render disabled with a TODO and report it — do NOT fake clients. */}
          </Select>
        </>)}

        {/* Goal + Phase (2-col) */}
        <Select value={goal} onValueChange={v=>setGoal(v)}>
          {/* hypertrophy=Muscle Growth, strength=Strength, fat_loss=Fat Loss, conditioning=Conditioning, general=General Fitness, mobility=Mobility */}
        </Select>
        <Select value={phase} onValueChange={v=>setPhase(v)}>
          {/* foundation=Foundation, strength=Strength, performance=Performance, return=Return */}
        </Select>

        {/* Duration + custom weeks + Days/Week (grid) */}
        <Select value={String(durationWeeks)} onValueChange={v=>setDurationWeeks(parseInt(v))}>
          {/* 4 weeks, 6 weeks, 8 weeks, 12 weeks, 0=Custom */}
        </Select>
        {durationWeeks === 0 && (
          <Input type="number" min={1} max={52} value={customWeeks} onChange={e=>setCustomWeeks(e.target.value)} placeholder="e.g. 16" />
        )}
        <Select value={String(daysPerWeek)} onValueChange={v=>setDaysPerWeek(parseInt(v))}>
          {/* options 2,3,4,5,6 → "N× / week" */}
        </Select>

        {/* Auto-repeat toggle: label "Auto-repeat" / "Restart program after completion" */}
        <Switch checked={autoRepeat} onCheckedChange={setAutoRepeat} />
      </CardContent></Card>

      <Button onClick={() => {
        if (!programName.trim()) { toast.error('Please enter a program name'); return; }
        initializeDays();
        setBuilderStep('days');
      }}>Continue to Build Days <ChevronRight/></Button>
    </div>
  )}
```

## Porting notes (v1 → v2 seam)
- v1 reads useAuthStore/useTrainerStore/useWorkoutStore. DROP those. Use w1 programs store
  (`src/features/programs/store.ts`) + types (`src/features/programs/types.ts`). If a Setup field
  (TrainingGoal/TrainingPhase enums, ProgramDay, DAY_LABEL_PRESETS, DEFAULT_SCHEDULE) is missing from
  the w1 types/constants, ADD it (small, additive) and note it in the report.
- `isTrainerMode`: derive from the v2 session/profile user mode (same source the rest of v2 uses —
  check `features/auth`). Athlete-self hides the Client select; trainer shows it.
- Real user id from `useSession()` — NEVER a stub id (see BUG-014).
- Route file stays a thin route → `<ProgramBuilder mode=... />`.
- Target structure: `src/features/programs/builder/ProgramBuilder.tsx` + `steps/SetupStep.tsx`
  (sub-componentised — do NOT recreate v1's 2437-line single file; G-16). No file > ~400 lines.

## Guardrails (proof block)
```
[ ] G-16 builder uses the w1 programs store; NO new program mega-store, NO 2000-line file
[ ] G-10 real uuids; no stub ids
[ ] no localStorage program persistence; no canonical_user_id; no next-day/rotation recompute here
[ ] PORT-UI fidelity — Setup fields/order/options/validation match v1 (adapted to v2 theme)
[ ] tsc + eslint + vitest + e2e green
```

## Tests (→ tests.md)
- Setup renders all fields; "Continue" blocked with empty name (toast), allowed when named.
- Trainer mode shows client select; athlete mode hides it.
- durationWeeks=Custom reveals weeks input; actualWeeks computes correctly.
- "Continue" initialises daysPerWeek empty ProgramDay[] into the w1 store + advances to step 'days'.
- grep-guards: no 'stub-user-id'; no canonical_user_id; no second program store; builder/ has no file >~400 lines.

## Report back (→ changes.md + conductor REPORT block)
Branch/commit · Changes · Schema touched? N · Tests (cmd+counts) · Build · Deviations/risks (esp.
client-list source, any w1 types added) · Verification still needed by Christo.
