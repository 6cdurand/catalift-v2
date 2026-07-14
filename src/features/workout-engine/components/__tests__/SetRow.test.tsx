import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { SetRow } from '../SetRow';
import type { LoggedSet } from '../../types';

afterEach(() => cleanup());

function makeSet(overrides: Partial<LoggedSet> = {}): LoggedSet {
  return {
    id: 'set-1',
    weight: 80,
    reps: 8,
    completed: true,
    setNumber: 1,
    ...overrides,
  };
}

const noop = () => {};

function renderRow(props: { set?: Partial<LoggedSet>; restRemaining?: number } = {}) {
  return render(
    <SetRow
      set={makeSet(props.set)}
      entryId="entry-1"
      onUpdateSet={noop}
      onCompleteSet={noop}
      onUncompleteSet={noop}
      onRemoveSet={noop}
      restRemaining={props.restRemaining}
    />,
  );
}

describe('SetRow rest countdown (Fix B)', () => {
  it('shows the countdown formatted mm:ss when restRemaining > 0', () => {
    renderRow({ restRemaining: 45 });
    const timer = screen.getByTestId('set-rest-timer');
    expect(timer).toBeDefined();
    expect(timer.textContent).toContain('0:45');
  });

  it('formats minutes and seconds correctly (90s => 1:30)', () => {
    renderRow({ restRemaining: 90 });
    expect(screen.getByTestId('set-rest-timer').textContent).toContain('1:30');
  });

  it('renders no timer when restRemaining is 0', () => {
    renderRow({ restRemaining: 0 });
    expect(screen.queryByTestId('set-rest-timer')).toBeNull();
  });

  it('renders no timer when restRemaining is undefined', () => {
    renderRow({ restRemaining: undefined });
    expect(screen.queryByTestId('set-rest-timer')).toBeNull();
  });
});
