// redirect-guard.ts \u2014 ported verbatim from v1 active/page.tsx:97-126.
// Pure function \u2014 no v1 dependencies.

export type ActiveWorkoutRedirectTarget = 'auth' | 'workout' | null;

export function shouldRedirectFromActiveWorkout(params: {
  isAuthenticated: boolean;
  activeWorkout: unknown;
  showSummary: boolean;
  completedWorkoutData: unknown;
  isFinishing: boolean;
  hasHydrated?: boolean;
}): ActiveWorkoutRedirectTarget {
  if (!params.isAuthenticated) return 'auth';
  if (params.hasHydrated === false) return null;
  if (
    !params.activeWorkout &&
    !params.showSummary &&
    !params.completedWorkoutData &&
    !params.isFinishing
  ) {
    return 'workout';
  }
  return null;
}
