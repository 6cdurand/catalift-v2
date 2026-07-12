/**
 * pbs-sort-filter.test.ts — Unit tests for PBs page sort + filter logic
 *
 * Tests the sorting (e1rm desc / recent / alphabetical) and search filtering
 * behavior without rendering the full component.
 */

import { describe, it, expect } from 'vitest';
import type { PersonalBestItem } from '@/features/workout-engine/api/fetch-personal-bests';

// Extract the filter + sort logic from the component for pure testing
function filterAndSortPBs(
  pbs: PersonalBestItem[],
  searchTerm: string,
  sortBy: 'e1rm' | 'recent' | 'alphabetical',
  getDisplayName: (exerciseId: string, fallback?: string) => string,
): PersonalBestItem[] {
  let filtered = pbs;
  
  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter((pb) => {
      const name = getDisplayName(pb.exerciseId, pb.exerciseName || undefined).toLowerCase();
      return name.includes(q) || pb.exerciseId.toLowerCase().includes(q);
    });
  }

  const sorted = [...filtered];
  switch (sortBy) {
    case 'e1rm':
      sorted.sort((a, b) => (b.oneRepMax || 0) - (a.oneRepMax || 0));
      break;
    case 'recent':
      sorted.sort(
        (a, b) =>
          new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime()
      );
      break;
    case 'alphabetical':
      sorted.sort((a, b) => {
        const an = getDisplayName(a.exerciseId, a.exerciseName || undefined);
        const bn = getDisplayName(b.exerciseId, b.exerciseName || undefined);
        return an.localeCompare(bn);
      });
      break;
  }

  return sorted;
}

describe('PBs sort + filter logic', () => {
  const mockPBs: PersonalBestItem[] = [
    {
      id: 'pb-1',
      exerciseId: 'bench-press',
      exerciseName: 'Bench Press',
      userId: 'user-1',
      oneRepMax: 100,
      bestWeight: 90,
      bestReps: 5,
      bestVolume: 450,
      achievedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'pb-2',
      exerciseId: 'squat',
      exerciseName: 'Squat',
      userId: 'user-1',
      oneRepMax: 140,
      bestWeight: 120,
      bestReps: 6,
      bestVolume: 720,
      achievedAt: '2024-02-20T10:00:00Z',
    },
    {
      id: 'pb-3',
      exerciseId: 'deadlift',
      exerciseName: 'Deadlift',
      userId: 'user-1',
      oneRepMax: 160,
      bestWeight: 150,
      bestReps: 4,
      bestVolume: 600,
      achievedAt: '2024-01-10T10:00:00Z',
    },
  ];

  const simpleDisplayName = (exerciseId: string, fallback?: string) =>
    fallback || exerciseId;

  it('sorts by e1RM descending (default)', () => {
    const result = filterAndSortPBs(mockPBs, '', 'e1rm', simpleDisplayName);
    expect(result.map((pb) => pb.exerciseId)).toEqual([
      'deadlift',
      'squat',
      'bench-press',
    ]);
  });

  it('sorts by recent (achievedAt descending)', () => {
    const result = filterAndSortPBs(mockPBs, '', 'recent', simpleDisplayName);
    expect(result.map((pb) => pb.exerciseId)).toEqual([
      'squat',
      'bench-press',
      'deadlift',
    ]);
  });

  it('sorts alphabetically by display name', () => {
    const result = filterAndSortPBs(mockPBs, '', 'alphabetical', simpleDisplayName);
    expect(result.map((pb) => pb.exerciseId)).toEqual([
      'bench-press',
      'deadlift',
      'squat',
    ]);
  });

  it('filters by search term (exercise name)', () => {
    const result = filterAndSortPBs(mockPBs, 'squat', 'e1rm', simpleDisplayName);
    expect(result).toHaveLength(1);
    expect(result[0].exerciseId).toBe('squat');
  });

  it('filters by search term (exercise ID)', () => {
    const result = filterAndSortPBs(mockPBs, 'dead', 'e1rm', simpleDisplayName);
    expect(result).toHaveLength(1);
    expect(result[0].exerciseId).toBe('deadlift');
  });

  it('returns empty array when no matches', () => {
    const result = filterAndSortPBs(mockPBs, 'nonexistent', 'e1rm', simpleDisplayName);
    expect(result).toHaveLength(0);
  });

  it('search is case-insensitive', () => {
    const result = filterAndSortPBs(mockPBs, 'BENCH', 'e1rm', simpleDisplayName);
    expect(result).toHaveLength(1);
    expect(result[0].exerciseId).toBe('bench-press');
  });

  it('combines search + sort correctly', () => {
    // Add more PBs to test combination
    const extendedPBs: PersonalBestItem[] = [
      ...mockPBs,
      {
        id: 'pb-4',
        exerciseId: 'overhead-press',
        exerciseName: 'Overhead Press',
        userId: 'user-1',
        oneRepMax: 70,
        bestWeight: 60,
        bestReps: 6,
        bestVolume: 360,
        achievedAt: '2024-03-01T10:00:00Z',
      },
    ];

    // Search for "press" (matches bench-press and overhead-press), sort by e1RM
    const result = filterAndSortPBs(
      extendedPBs,
      'press',
      'e1rm',
      simpleDisplayName
    );
    expect(result).toHaveLength(2);
    expect(result[0].exerciseId).toBe('bench-press'); // 100kg
    expect(result[1].exerciseId).toBe('overhead-press'); // 70kg
  });
});
