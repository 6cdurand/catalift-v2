// Shared builder types for workout-engine components.
// These mirror the ProgramExercise / ProgramBlock shapes from the programs feature
// but are defined here to avoid cross-feature imports (ESLint no-restricted-imports).

export interface BuilderExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  movementPattern: string;
  sets: number;
  reps: string;
  rest: string;
  repType?: string;
  setStyle?: string;
  tempo?: string;
  notes?: string;
}

export interface BuilderBlock {
  id: string;
  type: string;
  name: string;
  exercises: BuilderExercise[];
}
