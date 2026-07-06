// Public API of the programs feature (Programs Wave 1: data layer + next-workout).

export type {
  Weekday,
  BlockType,
  TrainingPhase,
  TrainingGoal,
  MovementPattern,
  ScheduleMode,
  ProgramExercise,
  ProgramBlock,
  ProgramDay,
  ClientProgram,
  SavedProgram,
} from "./types";

export {
  getNextProgramWorkout,
  sanitizeProgramForSave,
  type NextWorkoutResult,
} from "./lib/get-next-workout";

export { useProgramsStore, type ProgramsState } from "./store";

export { saveProgramTemplate } from "./api/save-template";
export { assignProgramToClient } from "./api/assign";
export {
  fetchSavedPrograms,
  fetchClientProgramsForTrainer,
  fetchClientProgramsForClient,
} from "./api/fetch";
export { deleteSavedProgram, deleteClientProgram } from "./api/delete";
export {
  listBlocks,
  type SavedBlock,
  type SavedBlockType,
} from "./api/blocks";
export {
  updateSavedProgram,
  updateClientProgramProgress,
  type ClientProgramProgressUpdate,
} from "./api/update";
