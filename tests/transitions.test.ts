// TEST_MATRIX §1.4：状态机迁移与非法迁移 throw（原规格 §112–113）。
import { describe, expect, it } from 'vitest';
import { assertTransition, canUnplug, isLegalTransition } from '../src/game/transitions';
import type { Phase } from '../src/game/types';

// T1：合法迁移集合与 §18.5 迁移表一致
describe('T1 legal transitions', () => {
  const legal: Array<[Phase, Phase]> = [
    ['BOOT', 'HOME_OFF'],
    ['HOME_OFF', 'BOOTING'],
    ['BOOTING', 'TUTORIAL'],
    ['BOOTING', 'ROUND_EDITING'],
    ['TUTORIAL', 'ROUND_EDITING'],
    ['ROUND_EDITING', 'ROUND_BURNING'],
    ['ROUND_BURNING', 'ROUND_RESULT'],
    ['ROUND_RESULT', 'ROUND_EDITING'],
    ['ROUND_RESULT', 'ENDING'],
    ['ROUND_EDITING', 'ENDING'],
    ['ENDING', 'HOME_OFF'],
    ['ENDING', 'BOOTING'],
  ];
  for (const [from, to] of legal) {
    it(`${from} -> ${to}`, () => {
      expect(isLegalTransition(from, to)).toBe(true);
    });
  }
});

// T2：非法迁移 throw（原规格 §113）
describe('T2 illegal transitions throw', () => {
  it('HOME_OFF -> ROUND_RESULT throws', () => {
    expect(() => assertTransition('HOME_OFF', 'ROUND_RESULT')).toThrow();
  });
  it('BOOT -> ENDING throws', () => {
    expect(() => assertTransition('BOOT', 'ENDING')).toThrow();
  });
  it('ROUND_EDITING -> BOOT throws', () => {
    expect(() => assertTransition('ROUND_EDITING', 'BOOT')).toThrow();
  });
  it('TUTORIAL -> ROUND_BURNING throws', () => {
    expect(() => assertTransition('TUTORIAL', 'ROUND_BURNING')).toThrow();
  });
});

// 结局 E 拔插头门控（§13 / 状态机表）
describe('unplug gating', () => {
  it('only cycle>=9 in ROUND_EDITING/ROUND_RESULT', () => {
    expect(canUnplug('ROUND_EDITING', 9)).toBe(true);
    expect(canUnplug('ROUND_RESULT', 12)).toBe(true);
    expect(canUnplug('ROUND_EDITING', 8)).toBe(false);
    expect(canUnplug('ROUND_BURNING', 12)).toBe(false);
    expect(canUnplug('HOME_OFF', 12)).toBe(false);
  });
});
