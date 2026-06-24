import { describe, it, expect } from 'vitest';
import {
  evolvingMedals,
  milestoneMedals,
  medalDefinitions,
  NON_EVOLVING_MEDAL_IDS,
  getMedalDefinition,
  getEvolvingMedal,
  getMedalsByCategory,
  getMedalsByTier,
  getMedalsByRarity,
  getEvolutionGlowTier,
  getEvolutionGlowLabel,
  getNextEvolutionThreshold,
  getEvolutionNumber,
  isCloseToEvolving,
  isTrainerMedal,
  getMedalPriority,
  sortMedalsByPriority,
  getCurrentEvolutionTier,
  getSpeedThresholds,
  getMedalEvolutionSpeed,
} from '../medals';
import type { MedalDefinition } from '@/types';

describe('medals — static data integrity', () => {
  it('exports a non-empty array of milestone medals', () => {
    expect(milestoneMedals.length).toBeGreaterThan(0);
    expect(medalDefinitions).toEqual(milestoneMedals);
  });

  it('exports 3 evolving medals (workout-warrior, streak-master, iron-lifter)', () => {
    expect(evolvingMedals).toHaveLength(3);
    const ids = evolvingMedals.map(m => m.id);
    expect(ids).toContain('workout-warrior');
    expect(ids).toContain('streak-master');
    expect(ids).toContain('iron-lifter');
  });

  it('every evolving medal has 5 tiers in ascending order', () => {
    for (const medal of evolvingMedals) {
      expect(medal.evolutions).toHaveLength(5);
      const targets = medal.evolutions.map(e => e.target);
      for (let i = 1; i < targets.length; i++) {
        expect(targets[i]).toBeGreaterThan(targets[i - 1]);
      }
    }
  });

  it('every milestone medal has a unique id', () => {
    const ids = milestoneMedals.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('NON_EVOLVING_MEDAL_IDS does not include evolving medal ids', () => {
    for (const evo of evolvingMedals) {
      expect(NON_EVOLVING_MEDAL_IDS.has(evo.id)).toBe(false);
    }
  });
});

describe('medals — lookup functions', () => {
  it('getMedalDefinition returns the correct medal by id', () => {
    const medal = getMedalDefinition('first-workout');
    expect(medal).toBeDefined();
    expect(medal!.id).toBe('first-workout');
    expect(medal!.category).toBe('workout');
  });

  it('getMedalDefinition returns undefined for unknown id', () => {
    expect(getMedalDefinition('nonexistent-medal')).toBeUndefined();
  });

  it('getEvolvingMedal returns the correct evolving medal by id', () => {
    const medal = getEvolvingMedal('workout-warrior');
    expect(medal).toBeDefined();
    expect(medal!.id).toBe('workout-warrior');
  });

  it('getEvolvingMedal returns undefined for non-evolving id', () => {
    expect(getEvolvingMedal('first-workout')).toBeUndefined();
  });

  it('getMedalsByCategory filters correctly', () => {
    const strengthMedals = getMedalsByCategory('strength');
    expect(strengthMedals.length).toBeGreaterThan(0);
    for (const m of strengthMedals) {
      expect(m.category).toBe('strength');
    }
  });

  it('getMedalsByTier filters correctly', () => {
    const bronzeMedals = getMedalsByTier('bronze');
    expect(bronzeMedals.length).toBeGreaterThan(0);
    for (const m of bronzeMedals) {
      expect(m.tier).toBe('bronze');
    }
  });

  it('getMedalsByRarity filters correctly', () => {
    const legendary = getMedalsByRarity('legendary');
    expect(legendary.length).toBeGreaterThan(0);
    for (const m of legendary) {
      expect(m.rarity).toBe('legendary');
    }
  });
});

describe('medals — evolution glow logic', () => {
  it('non-evolving medal always returns base glow', () => {
    expect(getEvolutionGlowTier(100, 'first-workout')).toBe('base');
    expect(getEvolutionGlowTier(0, 'bench-100')).toBe('base');
  });

  it('evolving medal with very_slow speed: gold at 10, diamond at 30, pink at 75', () => {
    const speed = 'very_slow' as const;
    expect(getEvolutionGlowTier(0, undefined, speed)).toBe('base');
    expect(getEvolutionGlowTier(9, undefined, speed)).toBe('base');
    expect(getEvolutionGlowTier(10, undefined, speed)).toBe('gold_glow');
    expect(getEvolutionGlowTier(29, undefined, speed)).toBe('gold_glow');
    expect(getEvolutionGlowTier(30, undefined, speed)).toBe('diamond_glow');
    expect(getEvolutionGlowTier(74, undefined, speed)).toBe('diamond_glow');
    expect(getEvolutionGlowTier(75, undefined, speed)).toBe('pink_diamond_glow');
  });

  it('evolving medal with fast speed: gold at 3, diamond at 10, pink at 25', () => {
    const speed = 'fast' as const;
    expect(getEvolutionGlowTier(2, undefined, speed)).toBe('base');
    expect(getEvolutionGlowTier(3, undefined, speed)).toBe('gold_glow');
    expect(getEvolutionGlowTier(10, undefined, speed)).toBe('diamond_glow');
    expect(getEvolutionGlowTier(25, undefined, speed)).toBe('pink_diamond_glow');
  });

  it('getEvolutionGlowLabel returns correct labels', () => {
    expect(getEvolutionGlowLabel('base')).toBe('');
    expect(getEvolutionGlowLabel('gold_glow')).toBe('Gold');
    expect(getEvolutionGlowLabel('diamond_glow')).toBe('Diamond');
    expect(getEvolutionGlowLabel('pink_diamond_glow')).toBe('Pink Diamond');
  });

  it('getNextEvolutionThreshold returns next threshold or null', () => {
    const speed = 'slow' as const; // [5, 20, 50]
    expect(getNextEvolutionThreshold(0, undefined, speed)).toBe(5);
    expect(getNextEvolutionThreshold(4, undefined, speed)).toBe(5);
    expect(getNextEvolutionThreshold(5, undefined, speed)).toBe(20);
    expect(getNextEvolutionThreshold(19, undefined, speed)).toBe(20);
    expect(getNextEvolutionThreshold(50, undefined, speed)).toBeNull();
  });

  it('getEvolutionNumber returns correct evolution level', () => {
    const speed = 'slow' as const; // [5, 20, 50]
    expect(getEvolutionNumber(0, undefined, speed)).toBe(0);
    expect(getEvolutionNumber(5, undefined, speed)).toBe(1);
    expect(getEvolutionNumber(20, undefined, speed)).toBe(2);
    expect(getEvolutionNumber(50, undefined, speed)).toBe(3);
  });

  it('isCloseToEvolving returns close=true when within 20% threshold', () => {
    const speed = 'slow' as const; // [5, 20, 50]
    // threshold = max(2, ceil(5 * 0.2)) = 2
    const result = isCloseToEvolving(4, undefined, speed);
    expect(result.close).toBe(true);
    expect(result.next).toBe(5);
    expect(result.remaining).toBe(1);
  });

  it('isCloseToEvolving returns close=false for non-evolving medal', () => {
    const result = isCloseToEvolving(100, 'first-workout');
    expect(result.close).toBe(false);
    expect(result.next).toBeNull();
    expect(result.remaining).toBe(0);
  });
});

describe('medals — evolution tier progression', () => {
  it('getCurrentEvolutionTier returns bronze for progress below first target', () => {
    const medal = evolvingMedals[0]; // workout-warrior
    const result = getCurrentEvolutionTier(medal, 0);
    expect(result.tier).toBe('bronze');
    expect(result.currentTarget).toBe(0);
    expect(result.nextTarget).toBe(1);
  });

  it('getCurrentEvolutionTier returns diamond at highest target', () => {
    const medal = evolvingMedals[0]; // workout-warrior, diamond at 250
    const result = getCurrentEvolutionTier(medal, 250);
    expect(result.tier).toBe('diamond');
    expect(result.nextTarget).toBeNull();
  });

  it('getCurrentEvolutionTier returns gold at gold target', () => {
    const medal = evolvingMedals[0]; // workout-warrior, gold at 50
    const result = getCurrentEvolutionTier(medal, 50);
    expect(result.tier).toBe('gold');
    expect(result.nextTarget).toBe(100);
  });
});

describe('medals — utility functions', () => {
  it('isTrainerMedal returns true for trainer- prefixed ids', () => {
    expect(isTrainerMedal('trainer-something')).toBe(true);
    expect(isTrainerMedal('first-workout')).toBe(false);
  });

  it('getMedalPriority returns correct priority by category', () => {
    const strengthMedal: MedalDefinition = {
      id: 'test', name: 'Test', description: '', icon: '',
      tier: 'bronze', category: 'strength', rarity: 'common',
      requirement: '', target: 0,
    };
    expect(getMedalPriority(strengthMedal)).toBe(1);

    const workoutMedal: MedalDefinition = {
      ...strengthMedal, category: 'workout',
    };
    expect(getMedalPriority(workoutMedal)).toBe(4);
  });

  it('sortMedalsByPriority sorts by priority then rarity', () => {
    const medals: MedalDefinition[] = [
      { id: 'a', name: 'A', description: '', icon: '', tier: 'bronze', category: 'workout', rarity: 'common', requirement: '', target: 0 },
      { id: 'b', name: 'B', description: '', icon: '', tier: 'bronze', category: 'strength', rarity: 'legendary', requirement: '', target: 0 },
      { id: 'c', name: 'C', description: '', icon: '', tier: 'bronze', category: 'strength', rarity: 'rare', requirement: '', target: 0 },
    ];
    const sorted = sortMedalsByPriority(medals);
    // strength (priority 1) before workout (priority 4)
    // Within same priority, medals are sorted by rarity order
    const strengthMedals = sorted.filter(m => m.category === 'strength');
    expect(strengthMedals).toHaveLength(2);
    expect(strengthMedals[0].id).toBe('c'); // rare
    expect(strengthMedals[1].id).toBe('b'); // legendary
    // Workout medal (priority 4) comes after strength (priority 1)
    expect(sorted[sorted.length - 1].id).toBe('a');
  });

  it('getSpeedThresholds returns correct thresholds for each speed', () => {
    expect(getSpeedThresholds('fast')).toEqual([3, 10, 25]);
    expect(getSpeedThresholds('medium')).toEqual([5, 15, 40]);
    expect(getSpeedThresholds('slow')).toEqual([5, 20, 50]);
    expect(getSpeedThresholds('very_slow')).toEqual([10, 30, 75]);
  });

  it('getMedalEvolutionSpeed returns very_slow for strength medals, slow as default', () => {
    expect(getMedalEvolutionSpeed('bench-100')).toBe('very_slow');
    expect(getMedalEvolutionSpeed('nonexistent')).toBe('slow');
  });
});
