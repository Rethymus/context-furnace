// TEST_MATRIX §1.4：GameState 规则（D4/D8/D9/D10 + §17.2 CORE 规则 + T3/T4/T5/T6/T7）。
import { describe, expect, it } from 'vitest';
import { CARDS, cardForCycle } from '../src/game/cards';
import {
  averageCutPercent,
  createInitialState,
  evaluateEnding,
  hasCoreSelected,
  loadRound,
  setCut,
  setGain,
  applyRoundResult,
} from '../src/game/state';
import { computeRound } from '../src/game/scoring';
import { DECAY_ACT, actForCycle } from '../src/game/constants';
import type { GameState } from '../src/game/types';

const ZERO_HIDDEN = { agitation: 0, polarization: 0, reduction: 0 };

// T3：结局优先级（§13：A → B → C/D）
describe('T3 ending priority', () => {
  const base = createInitialState();
  it('heat<=0 → A', () => {
    expect(evaluateEnding({ ...base, heat: 0, fidelity: 0 })).toBe('A');
  });
  it('fidelity<=0 → B', () => {
    expect(evaluateEnding({ ...base, heat: 50, fidelity: 0 })).toBe('B');
  });
  it('cycle 12 done, fidelity>=60 → C', () => {
    expect(evaluateEnding({ ...base, cycle: 12, roundsCompleted: 12, heat: 24, fidelity: 92 })).toBe('C');
  });
  it('cycle 12 done, 0<fidelity<60 → D', () => {
    expect(evaluateEnding({ ...base, cycle: 12, roundsCompleted: 12, heat: 66, fidelity: 14 })).toBe('D');
  });
  it('mid-game healthy → null', () => {
    expect(evaluateEnding({ ...base, cycle: 5, roundsCompleted: 4, heat: 48, fidelity: 79 })).toBe(null);
  });
});

// T4：IGNITE 后轮次锁定（setCut/setGain 非编辑状态静默无效）
describe('T4 round lock', () => {
  it('setCut ignored in ROUND_BURNING', () => {
    const s: GameState = { ...createInitialState(), phase: 'ROUND_BURNING', cutLeft: 0, cutRight: 6 };
    expect(setCut(s, 1, 2)).toBe(s);
  });
  it('setGain ignored in ROUND_RESULT', () => {
    const s: GameState = { ...createInitialState(), phase: 'ROUND_RESULT' };
    expect(setGain(s, 1)).toBe(s);
  });
});

// T5：GAIN 解锁时刻表（§27）
describe('T5 gain unlock schedule', () => {
  const base: GameState = { ...createInitialState(), phase: 'ROUND_EDITING' };
  it('setGain rejects beyond schedule', () => {
    const c4 = { ...base, cycle: 4 };
    expect(setGain(c4, 1)).toBe(c4);
    const c5 = { ...base, cycle: 5 };
    expect(setGain(c5, 1).gain).toBe(1);
    expect(setGain(c5, 2)).toBe(c5);
    const c7 = { ...base, cycle: 7 };
    expect(setGain(c7, 2).gain).toBe(2);
    const c9 = { ...base, cycle: 9 };
    expect(setGain(c9, 3).gain).toBe(3);
  });
  it('highestGain tracks max used', () => {
    const c9: GameState = { ...base, cycle: 9, gain: 1, highestGain: 1 };
    expect(setGain(c9, 3).highestGain).toBe(3);
  });
});

// T6：LOAD 重置全选；GAIN 跨周期保持（D9）
describe('T6 load reset (D9)', () => {
  it('loadRound resets selection to full, keeps gain', () => {
    const s: GameState = {
      ...createInitialState(),
      phase: 'ROUND_EDITING',
      cycle: 5,
      gain: 1,
      cutLeft: 2,
      cutRight: 3,
    };
    const loaded = loadRound(s, cardForCycle(5));
    expect(loaded.cutLeft).toBe(0);
    expect(loaded.cutRight).toBe(6);
    expect(loaded.gain).toBe(1);
  });
});

// T7：peakHeat（D10）与平均切除比例（D4）
describe('T7 stats', () => {
  it('peakHeat starts at 52 and never decreases', () => {
    const s = createInitialState();
    expect(s.peakHeat).toBe(52);
    const card = CARDS[0]!;
    const r = computeRound(card, 0, card.segments.length - 1, 0, DECAY_ACT[actForCycle(1) - 1]!, {
      heat: 50,
      fidelity: 100,
      ...ZERO_HIDDEN,
    });
    const s2 = applyRoundResult({ ...s, heat: 50 }, r);
    expect(s2.peakHeat).toBe(52); // 50+11=61? no: heat 50 → 61? computeRound: 50-12+10=48 < 52
    expect(s2.heat).toBe(48);
  });
  it('averageCutPercent (D4)', () => {
    const s: GameState = { ...createInitialState(), totalCutRatio: 0.5, roundsCompleted: 2 };
    expect(averageCutPercent(s)).toBe(25);
    expect(averageCutPercent({ ...s, roundsCompleted: 0 })).toBe(0);
  });
});

// §17.2 / §6.2：CORE 硬规则（§18 称 T8）
describe('core selection rule', () => {
  it('selection containing CORE passes', () => {
    const card = CARDS[0]!; // CORE = s2（index 2）
    expect(hasCoreSelected(card, 0, 6)).toBe(true);
    expect(hasCoreSelected(card, 2, 4)).toBe(true);
  });
  it('selection missing CORE fails', () => {
    const card = CARDS[0]!;
    expect(hasCoreSelected(card, 0, 1)).toBe(false);
    expect(hasCoreSelected(card, 3, 6)).toBe(false);
  });
});
