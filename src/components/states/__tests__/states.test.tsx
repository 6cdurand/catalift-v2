/**
 * State components tests — Phase-2 Lane 1
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Heart } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../index';

describe('State Components', () => {
  it('renders EmptyState with title', () => {
    const { container } = render(
      <EmptyState icon={Heart} title="Nothing here yet" />
    );
    expect(container.innerHTML).toContain('Nothing here yet');
  });

  it('renders EmptyState with coming-soon variant', () => {
    const { container } = render(
      <EmptyState 
        icon={Heart} 
        title="Coming soon" 
        variant="coming-soon"
      />
    );
    expect(container.innerHTML).toContain('Coming soon');
    expect(container.innerHTML).toContain('On the roadmap');
  });

  it('renders ErrorState with default message', () => {
    const { container } = render(<ErrorState />);
    expect(container.innerHTML).toContain('Something went wrong');
  });

  it('renders LoadingState with spinner', () => {
    const { container } = render(<LoadingState />);
    expect(container.innerHTML).toContain('Loading');
  });
});
