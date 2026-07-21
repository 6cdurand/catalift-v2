import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { ExerciseCard, type ExercisePBBadges } from '../ExerciseCard';
import { SupersetCard } from '../SupersetCard';
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
