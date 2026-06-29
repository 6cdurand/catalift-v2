import { describe, it, expect, beforeEach } from 'vitest';
import type { Exercise } from '@/types';
import { searchExercises, __resetSearchCacheForTests } from '../exerciseSearch';

describe('exerciseSearch', () => {
  beforeEach(() => {
    __resetSearchCacheForTests();
  });

  describe('exact match', () => {
    it('ranks exact name match first', () => {
      const results = searchExercises('Barbell Bench Press');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('bench-press');
    });

    it('exact match is case-insensitive', () => {
      const results = searchExercises('barbell bench press');
      expect(results[0].id).toBe('bench-press');
    });
  });

  describe('prefix match', () => {
    it('ranks prefix matches first', () => {
      const results = searchExercises('Barbell');
      expect(results.length).toBeGreaterThan(0);
      // Barbell Bench Press, Barbell Curl, Barbell Back Squat etc. should all be prefix matches
      const top = results.slice(0, 5);
      top.forEach(ex => {
        expect(ex.name.toLowerCase().startsWith('barbell')).toBe(true);
      });
    });
  });

  describe('alias match', () => {
    it('resolves "db row" to Dumbbell Row', () => {
      const results = searchExercises('db row');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('dumbbell-row');
    });

    it('resolves "ohp" to Overhead Press', () => {
      const results = searchExercises('ohp');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('overhead-press');
    });

    it('resolves "rdl" to Romanian Deadlift', () => {
      const results = searchExercises('rdl');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('romanian-deadlift');
    });
  });

  describe('substring match', () => {
    it('includes exercises whose name contains the query', () => {
      const results = searchExercises('squat');
      expect(results.length).toBeGreaterThan(0);
      const ids = results.map(ex => ex.id);
      expect(ids).toContain('back-squat');
      expect(ids).toContain('front-squat');
      expect(ids).toContain('goblet-squat');
    });
  });

  describe('unrelated query (P1 regression test)', () => {
    it('returns 0 or very few results for nonsense query', () => {
      const results = searchExercises('zzzzzzzzxxxqqqq');
      expect(results.length).toBe(0);
    });

    it('returns 0 for a random unrelated word', () => {
      const results = searchExercises('banana sandwich');
      expect(results.length).toBe(0);
    });
  });

  describe('typo tolerance (fuzzy fallback)', () => {
    it('still returns results for minor typos', () => {
      const results = searchExercises('bench pres');
      expect(results.length).toBeGreaterThan(0);
      const ids = results.map(ex => ex.id);
      expect(ids).toContain('bench-press');
    });
  });

  describe('empty query', () => {
    it('returns the full library', () => {
      const results = searchExercises('');
      expect(results.length).toBeGreaterThan(50);
    });
  });

  describe('searchExercisesLite signature', () => {
    it('returns lite shape with id, name, pattern, aliases', async () => {
      const { searchExercisesLite } = await import('../exerciseSearch');
      const results = searchExercisesLite('bench');
      expect(results.length).toBeGreaterThan(0);
      const first = results[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('pattern');
      expect(first).toHaveProperty('aliases');
    });
  });

  describe('extraExercises', () => {
    it('includes custom exercises in search results', () => {
      const custom: Exercise = {
        id: 'custom-test-exercise',
        name: 'My Custom Test Exercise',
        primaryMuscles: ['chest'],
        secondaryMuscles: [],
        category: 'compound',
        equipment: 'barbell',
        isCustom: true,
      };
      const results = searchExercises('My Custom', { extraExercises: [custom] });
      const ids = results.map(ex => ex.id);
      expect(ids).toContain('custom-test-exercise');
    });
  });

  describe('limit option', () => {
    it('caps results at the specified limit', () => {
      const results = searchExercises('', { limit: 5 });
      expect(results.length).toBe(5);
    });
  });
});
