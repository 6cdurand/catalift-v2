import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';

import { SupersetCard } from '../SupersetCard';
import type { WorkoutBlock, ExerciseEntry } from '../../types';

afterEach(() => cleanup());

// Regression guard for the header/add-bar port (PR A): the block model
// (SupersetCard → ExerciseCard/SetRow, drop-sets in set.drops[]) must keep
// rendering + exposing edit affordances. If supersets or drop-sets stop
// rendering, that's a FAIL per the task's HARD CONSTRAINT.

function entry(id: string, name: string): ExerciseEntry {
  return {
    id,
    exerciseId: id,
    exerciseName: name,
    sets: [
      {
        id: `${id}-set1`,
        setNumber: 1,
        weight: 80,
        reps: 8,
        completed: true,
        // Drop-set sub-row (v1 set.drops[]): must still render + edit.
        drops: [{ id: `${id}-drop1`, weight: 60, reps: 6 }],
      },
    ],
  };
}

function supersetBlock(): Extract<WorkoutBlock, { kind: 'superset' }> {
  return {
    id: 'ss-1',
    kind: 'superset',
    exercises: [entry('bench-press', 'Bench Press'), entry('db-row', 'DB Row')],
  };
}

const noop = () => {};

function renderSuperset() {
  return render(
    <SupersetCard
      block={supersetBlock()}
      onAddSet={noop}
      onUpdateSet={noop}
      onCompleteSet={noop}
      onUncompleteSet={noop}
      onRemoveSet={noop}
      onRemoveExercise={noop}
      onRemoveBlock={noop}
      onAddDropSet={noop}
      onUpdateDrop={noop}
      onRemoveDrop={noop}
    />,
  );
}

describe('SupersetCard still renders supersets + drop-sets (PR A regression)', () => {
  it('renders both grouped exercises', () => {
    renderSuperset();
    expect(screen.getByText('Bench Press')).toBeDefined();
    expect(screen.getByText('DB Row')).toBeDefined();
    expect(screen.getByText('Superset')).toBeDefined();
  });

  it('renders a drop-set sub-row per exercise', () => {
    renderSuperset();
    const drops = screen.getAllByTestId('drop-set-row');
    // one per exercise
    expect(drops).toHaveLength(2);
    expect(within(drops[0]).getByText('Drop 1')).toBeDefined();
  });

  it('keeps drop-set inputs editable (weight/reps rendered with values)', () => {
    renderSuperset();
    const drops = screen.getAllByTestId('drop-set-row');
    const inputs = within(drops[0]).getAllByRole('spinbutton');
    // weight + reps inputs present and editable
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('60');
  });
});
