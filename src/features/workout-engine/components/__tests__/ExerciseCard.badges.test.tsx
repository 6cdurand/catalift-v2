import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { ExerciseCard, type ExercisePBBadges } from '../ExerciseCard';
import { SupersetCard } from '../SupersetCard';
import { StraightBlockCard } from '../StraightBlockCard';
import type { ExerciseEntry, WorkoutBlock } from '../../types';

afterEach(() => cleanup());

function entry(id: string, name: string): ExerciseEntry {
  return {
    id,
    exerciseId: id,
    exerciseName: name,
    sets: [{ id: `${id}-s1`, setNumber: 1, weight: 100, reps: 5, completed: true }],
  };
}

const noop = () => {};

const badges: ExercisePBBadges = {
  pb: { bestWeight: 120, bestReps: 5, oneRepMax: 135, bestVolume: 3000 },
  todayVolume: 1500,
  muscleLabel: 'Chest',
  previousDate: '2026-07-05T10:00:00.000Z',
  previousSummary: '110×5',
};

function renderCard(extra: Partial<ExercisePBBadges> = badges) {
  return render(
    <ExerciseCard
      entry={entry('bench-press', 'Bench Press')}
      onAddSet={noop}
      onUpdateSet={noop}
      onCompleteSet={noop}
      onUncompleteSet={noop}
      onRemoveSet={noop}
      onRemoveExercise={noop}
      {...extra}
    />,
  );
}

describe('ExerciseCard PB / previous / volume badges (PR B)', () => {
  it('renders the amber 🏆 PB badge with e1RM when pb is provided', () => {
    renderCard();
    expect(screen.getByText(/🏆 PB 120×5/)).toBeDefined();
    expect(screen.getByText(/135kg e1RM/)).toBeDefined();
  });

  it('renders the grey 🕐 previous badge as "MMM d · w×r"', () => {
    renderCard();
    // Jul 5 (date is UTC noon so no TZ rollover) · 110×5
    expect(screen.getByText(/🕐 Jul 5 · 110×5/)).toBeDefined();
  });

  it('renders the muscle label and the Best/Today volume bar', () => {
    renderCard();
    expect(screen.getByText('Chest')).toBeDefined();
    expect(screen.getByText(/Today 1500kg/)).toBeDefined();
    expect(screen.getByText(/Best 3000kg/)).toBeDefined();
  });

  it('renders NO badges when no optional props are supplied (block model intact)', () => {
    renderCard({});
    expect(screen.queryByText(/🏆 PB/)).toBeNull();
    expect(screen.queryByText(/🕐/)).toBeNull();
    expect(screen.queryByText(/Best /)).toBeNull();
  });
});

describe('Badges forwarded through a superset (PR B)', () => {
  function supersetBlock(): Extract<WorkoutBlock, { kind: 'superset' }> {
    return {
      id: 'ss-1',
      kind: 'superset',
      exercises: [entry('bench-press', 'Bench Press'), entry('db-row', 'DB Row')],
    };
  }

  it('shows the PB badge on a grouped exercise via badgesByEntryId', () => {
    render(
      <SupersetCard
        block={supersetBlock()}
        onAddSet={noop}
        onUpdateSet={noop}
        onCompleteSet={noop}
        onUncompleteSet={noop}
        onRemoveSet={noop}
        onRemoveExercise={noop}
        onRemoveBlock={noop}
        badgesByEntryId={{ 'bench-press': badges }}
      />,
    );
    // superset still renders both exercises …
    expect(screen.getByText('Bench Press')).toBeDefined();
    expect(screen.getByText('DB Row')).toBeDefined();
    // … and the forwarded PB badge appears on the wired one only
    expect(screen.getByText(/🏆 PB 120×5/)).toBeDefined();
  });
});

describe('StraightBlockCard — v1-parity grouped typed container', () => {
  function strengthBlock(exercises: ExerciseEntry[]): Extract<WorkoutBlock, { kind: 'straight' }> {
    return { id: 'blk-1', kind: 'straight', blockType: 'strength', exercises };
  }

  it('renders MANY exercises inside ONE coloured titled container', () => {
    render(
      <StraightBlockCard
        block={strengthBlock([entry('bench-press', 'Bench Press'), entry('db-row', 'DB Row')])}
        onAddSet={noop}
        onUpdateSet={noop}
        onCompleteSet={noop}
        onUncompleteSet={noop}
        onRemoveSet={noop}
        onRemoveExercise={noop}
        onRemoveBlock={noop}
        onAddExerciseToBlock={noop}
      />,
    );
    // Single container with the typed title …
    const containers = screen.getAllByTestId('straight-block-card');
    expect(containers).toHaveLength(1);
    expect(screen.getByText('Strength')).toBeDefined();
    expect(screen.getByText('2 exercises')).toBeDefined();
    // … wrapping BOTH exercises …
    expect(screen.getByText('Bench Press')).toBeDefined();
    expect(screen.getByText('DB Row')).toBeDefined();
    // … with an in-block "Add Exercise to Block" button (no type prompt).
    expect(screen.getByText(/Add Exercise to Block/)).toBeDefined();
  });

  it('titles + colours the container by blockType (warmup)', () => {
    render(
      <StraightBlockCard
        block={{ id: 'blk-w', kind: 'straight', blockType: 'warmup', exercises: [entry('jj', 'Jumping Jacks')] }}
        onAddSet={noop}
        onUpdateSet={noop}
        onCompleteSet={noop}
        onUncompleteSet={noop}
        onRemoveSet={noop}
        onRemoveExercise={noop}
        onRemoveBlock={noop}
        onAddExerciseToBlock={noop}
      />,
    );
    expect(screen.getByText('Warm-Up')).toBeDefined();
    expect(screen.getByText('1 exercise')).toBeDefined();
  });

  it('in-block Add button fires onAddExerciseToBlock with the block id (no type prompt)', () => {
    const onAdd = vi.fn();
    render(
      <StraightBlockCard
        block={strengthBlock([entry('bench-press', 'Bench Press')])}
        onAddSet={noop}
        onUpdateSet={noop}
        onCompleteSet={noop}
        onUncompleteSet={noop}
        onRemoveSet={noop}
        onRemoveExercise={noop}
        onRemoveBlock={noop}
        onAddExerciseToBlock={onAdd}
      />,
    );
    fireEvent.click(screen.getByText(/Add Exercise to Block/));
    expect(onAdd).toHaveBeenCalledWith('blk-1');
  });

  it('forwards PB badges to grouped exercises via badgesByEntryId', () => {
    render(
      <StraightBlockCard
        block={strengthBlock([entry('bench-press', 'Bench Press')])}
        onAddSet={noop}
        onUpdateSet={noop}
        onCompleteSet={noop}
        onUncompleteSet={noop}
        onRemoveSet={noop}
        onRemoveExercise={noop}
        onRemoveBlock={noop}
        onAddExerciseToBlock={noop}
        badgesByEntryId={{ 'bench-press': badges }}
      />,
    );
    expect(screen.getByText(/🏆 PB 120×5/)).toBeDefined();
  });
});
