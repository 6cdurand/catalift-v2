import type { WorkoutBlock } from '../types';
import type { BlockMemorySnapshot } from '../components/BlockMemoryCard';

export interface BlocksSummary {
  cardio: {
    activity: string;
    mode: string;
    distanceMeters: number;
    seconds: number;
    completed: boolean;
  }[];
  circuit: {
    style: string;
    roundsCompleted: number;
    roundsTarget?: number;
    seconds: number;
    completed: boolean;
  }[];
  warmupCount: number;
  totalCardioDistanceKm: number;
  totalCardioMinutes: number;
  totalCircuitRounds: number;
  hasNonStrengthWork: boolean;
}

export function summarizeBlocks(blocks: WorkoutBlock[]): BlocksSummary {
  const cardio = blocks
    .filter((b): b is Extract<WorkoutBlock, { kind: 'cardio' }> => b.kind === 'cardio')
    .map((b) => ({
      activity: b.exerciseName || 'Cardio',
      mode: 'steady',
      distanceMeters: b.cardio.distanceMeters ?? 0,
      seconds: b.cardio.durationSeconds ?? 0,
      completed: true,
    }));

  const circuit = blocks
    .filter((b): b is Extract<WorkoutBlock, { kind: 'circuit' }> => b.kind === 'circuit')
    .map((b) => {
      const roundsCompleted = b.stations.reduce((max, st) => {
        const stMax = st.sets.reduce((sMax, s) => Math.max(sMax, s.roundIndex ?? -1), -1);
        return Math.max(max, stMax + 1);
      }, 0);
      return {
        style: 'ROUNDS',
        roundsCompleted,
        roundsTarget: b.rounds,
        seconds: 0,
        completed: roundsCompleted >= b.rounds,
      };
    });

  const warmupCount = 0;

  const totalCardioDistanceKm = cardio.reduce((s, c) => s + c.distanceMeters / 1000, 0);
  const totalCardioMinutes = cardio.reduce((s, c) => s + c.seconds / 60, 0);
  const totalCircuitRounds = circuit.reduce((s, c) => s + c.roundsCompleted, 0);

  return {
    cardio,
    circuit,
    warmupCount,
    totalCardioDistanceKm,
    totalCardioMinutes,
    totalCircuitRounds,
    hasNonStrengthWork: cardio.length + circuit.length + warmupCount > 0,
  };
}

export function blocksToMemorySnapshots(blocks: WorkoutBlock[]): BlockMemorySnapshot[] {
  const snapshots: BlockMemorySnapshot[] = [];
  for (const b of blocks) {
    if (b.kind === 'cardio') {
      snapshots.push({
        id: b.id,
        type: 'cardio',
        name: b.exerciseName,
        cardioActivity: b.exerciseName,
        cardioMode: 'steady',
        distanceCompleted: b.cardio.distanceMeters ?? 0,
        timerSeconds: b.cardio.durationSeconds ?? 0,
        completed: true,
        splits: [],
      });
    } else if (b.kind === 'circuit') {
      const roundsCompleted = b.stations.reduce((max, st) => {
        const stMax = st.sets.reduce((sMax, s) => Math.max(sMax, s.roundIndex ?? -1), -1);
        return Math.max(max, stMax + 1);
      }, 0);
      const roundTimes = b.stations[0]?.sets
        .filter(s => s.completed && s.durationSeconds)
        .map(s => s.durationSeconds!) ?? [];
      snapshots.push({
        id: b.id,
        type: 'circuit',
        name: 'Circuit',
        rounds: b.rounds,
        roundsCompleted,
        roundTimes,
        circuitStyle: 'rounds',
        timerSeconds: 0,
        completed: roundsCompleted >= b.rounds,
      });
    }
  }
  return snapshots;
}

export interface SummaryData {
  id: string;
  name: string;
  duration: number;
  exercises: number;
  sets: number;
  totalVolume: number;
  pbs: string[];
  startTime: string;
  endTime: string;
  blocksSummary: BlocksSummary;
  blocks: BlockMemorySnapshot[];
}

export function computeSummaryData(
  workout: { id: string; name: string | null; blocks: WorkoutBlock[]; totalVolume: number; performedAt: string },
  durationSeconds: number,
  opts?: { pbs?: string[] },
): SummaryData {
  const blocksSummary = summarizeBlocks(workout.blocks);
  const blocks = blocksToMemorySnapshots(workout.blocks);

  // Count actual exercises (a straight block is now a multi-exercise container), not blocks.
  const exercises = workout.blocks.reduce((sum, b) => {
    if (b.kind === 'straight') return sum + b.exercises.length;
    if (b.kind === 'superset') return sum + b.exercises.length;
    if (b.kind === 'circuit') return sum + b.stations.length;
    return sum; // cardio counted separately in blocksSummary
  }, 0);
  const sets = workout.blocks.reduce((sum, b) => {
    if (b.kind === 'straight') return sum + b.exercises.reduce((s, e) => s + e.sets.filter(x => x.completed).length, 0);
    if (b.kind === 'superset') return sum + b.exercises.reduce((s, e) => s + e.sets.filter(x => x.completed).length, 0);
    if (b.kind === 'circuit') return sum + b.stations.reduce((s, e) => s + e.sets.filter(x => x.completed).length, 0);
    return sum;
  }, 0);

  const startTime = workout.performedAt;
  const endTime = new Date(new Date(workout.performedAt).getTime() + durationSeconds * 1000).toISOString();

  return {
    id: workout.id,
    name: workout.name || 'Workout',
    duration: durationSeconds,
    exercises,
    sets,
    totalVolume: workout.totalVolume,
    pbs: opts?.pbs ?? [],
    startTime,
    endTime,
    blocksSummary,
    blocks,
  };
}
