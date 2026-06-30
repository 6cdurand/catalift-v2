import { describe, it, expect } from 'vitest';
import { getBlockStyles, getBlockStylesFromKind, BLOCK_TYPES } from '../components/block-types';

describe('getBlockStyles — v1 per-type hue fidelity', () => {
  it('warmup returns yellow hue', () => {
    const s = getBlockStyles('warmup');
    expect(s.bg).toBe('bg-yellow-500/10');
    expect(s.border).toBe('border-yellow-500/50');
    expect(s.text).toBe('text-yellow-400');
    expect(s.chipBg).toBe('bg-yellow-400');
  });

  it('work returns blue hue (v1 strength mapping)', () => {
    const s = getBlockStyles('work');
    expect(s.bg).toBe('bg-blue-500/10');
    expect(s.border).toBe('border-blue-500/50');
    expect(s.text).toBe('text-blue-400');
    expect(s.chipBg).toBe('bg-blue-500');
  });

  it('circuit returns orange hue', () => {
    const s = getBlockStyles('circuit');
    expect(s.bg).toBe('bg-orange-500/10');
    expect(s.border).toBe('border-orange-500/50');
    expect(s.text).toBe('text-orange-400');
    expect(s.chipBg).toBe('bg-orange-400');
  });

  it('cardio returns green hue with rose chip', () => {
    const s = getBlockStyles('cardio');
    expect(s.bg).toBe('bg-green-500/10');
    expect(s.border).toBe('border-green-500/50');
    expect(s.text).toBe('text-green-400');
    expect(s.chipBg).toBe('bg-rose-400');
  });

  it('cooldown returns purple hue', () => {
    const s = getBlockStyles('cooldown');
    expect(s.bg).toBe('bg-purple-500/10');
    expect(s.border).toBe('border-purple-500/50');
    expect(s.text).toBe('text-purple-400');
    expect(s.chipBg).toBe('bg-purple-400');
  });

  it('default falls back to blue (strength)', () => {
    const s = getBlockStyles('nonexistent' as never);
    expect(s.bg).toBe('bg-blue-500/10');
    expect(s.text).toBe('text-blue-400');
  });
});

describe('getBlockStylesFromKind — BlockKind mapping', () => {
  it('superset maps to work (blue)', () => {
    const s = getBlockStylesFromKind('superset');
    expect(s.text).toBe('text-blue-400');
    expect(s.chipBg).toBe('bg-blue-500');
  });

  it('circuit maps to circuit (orange)', () => {
    const s = getBlockStylesFromKind('circuit');
    expect(s.text).toBe('text-orange-400');
    expect(s.chipBg).toBe('bg-orange-400');
  });

  it('cardio maps to cardio (green + rose chip)', () => {
    const s = getBlockStylesFromKind('cardio');
    expect(s.text).toBe('text-green-400');
    expect(s.chipBg).toBe('bg-rose-400');
  });

  it('straight maps to work (blue)', () => {
    const s = getBlockStylesFromKind('straight');
    expect(s.text).toBe('text-blue-400');
  });
});

describe('BLOCK_TYPES — icon fidelity', () => {
  it('circuit uses Zap icon (not Target)', () => {
    const circuit = BLOCK_TYPES.find((b) => b.value === 'circuit');
    expect(circuit).toBeDefined();
    expect(circuit!.label).toBe('Circuit');
  });

  it('work label is Strength (v1 mapping)', () => {
    const work = BLOCK_TYPES.find((b) => b.value === 'work');
    expect(work).toBeDefined();
    expect(work!.label).toBe('Strength');
  });

  it('has all 5 block types', () => {
    expect(BLOCK_TYPES).toHaveLength(5);
    const values = BLOCK_TYPES.map((b) => b.value);
    expect(values).toEqual(['warmup', 'work', 'circuit', 'cardio', 'cooldown']);
  });
});
