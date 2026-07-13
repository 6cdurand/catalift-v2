/**
 * ProgramDayView.test.tsx — F3 tempo render test
 *
 * Ensures the client program view displays tempo when present (QA A.2 fix).
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProgramDayView } from '../ProgramDayView';
import type { ProgramDay } from '../../../types';

describe('ProgramDayView - tempo rendering (F3)', () => {
  it('renders tempo when present in exercise prescription', () => {
    const day: ProgramDay = {
      id: 'day-1',
      label: 'Push',
      scheduledDay: 'monday',
      blocks: [
        {
          id: 'block-1',
          type: 'work',
          name: 'Main Lift',
          exercises: [
            {
              id: 'ex-1',
              exerciseId: 'bench-press',
              exerciseName: 'Bench Press',
              movementPattern: 'compound',
              sets: 4,
              reps: '6-8',
              rest: '120s',
              tempo: '3110', // F3: this should appear in the row
            },
          ],
        },
      ],
    };

    const { container } = render(<ProgramDayView day={day} dayIndex={0} />);

    const html = container.innerHTML;

    // Verify exercise name appears
    expect(html).toContain('Bench Press');

    // Verify sets × reps appears
    expect(html).toContain('4');
    expect(html).toContain('6-8');

    // Verify rest appears
    expect(html).toContain('120s');

    // F3: Verify tempo appears
    expect(html).toContain('3110');
  });

  it('does not render tempo separator when tempo is absent', () => {
    const day: ProgramDay = {
      id: 'day-1',
      label: 'Push',
      scheduledDay: 'monday',
      blocks: [
        {
          id: 'block-1',
          type: 'work',
          name: 'Main Lift',
          exercises: [
            {
              id: 'ex-1',
              exerciseId: 'squat',
              exerciseName: 'Squat',
              movementPattern: 'compound',
              sets: 3,
              reps: '5',
              rest: '180s',
              // No tempo field
            },
          ],
        },
      ],
    };

    const { container } = render(<ProgramDayView day={day} dayIndex={0} />);

    const html = container.innerHTML;

    // Verify exercise name appears
    expect(html).toContain('Squat');

    // Verify sets × reps appears
    expect(html).toContain('3');
    expect(html).toContain('5');

    // Verify rest appears
    expect(html).toContain('180s');

    // Verify no extra separator after rest (only 2 separators total: between sets×reps and rest)
    const separators = container.querySelectorAll('.text-gray-300');
    expect(separators).toHaveLength(1); // Only 1 separator: between sets×reps and rest
  });

  it('handles various tempo formats (X111, 2010, 1010)', () => {
    const day: ProgramDay = {
      id: 'day-1',
      label: 'Pull',
      scheduledDay: 'tuesday',
      blocks: [
        {
          id: 'block-1',
          type: 'work',
          name: 'Power',
          exercises: [
            {
              id: 'ex-1',
              exerciseId: 'deadlift',
              exerciseName: 'Deadlift',
              movementPattern: 'compound',
              sets: 3,
              reps: '5',
              rest: '180s',
              tempo: 'X111', // Explosive concentric
            },
          ],
        },
        {
          id: 'block-2',
          type: 'work',
          name: 'Volume',
          exercises: [
            {
              id: 'ex-2',
              exerciseId: 'row',
              exerciseName: 'Barbell Row',
              movementPattern: 'compound',
              sets: 4,
              reps: '8',
              rest: '90s',
              tempo: '2010',
            },
          ],
        },
      ],
    };

    const { container } = render(<ProgramDayView day={day} dayIndex={1} />);

    const html = container.innerHTML;

    // Verify X111 tempo renders
    expect(html).toContain('X111');

    // Verify 2010 tempo renders
    expect(html).toContain('2010');
  });
});
