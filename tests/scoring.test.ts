// TEST_MATRIX §1.1 + §2：scoring 断言与黄金路径 headless 干跑（期望值逐轮钉死）。
import { describe, expect, it } from 'vitest';
import { CARDS, cardForCycle } from '../src/game/cards';
import {
  DECAY_ACT,
  INITIAL_FIDELITY,
  INITIAL_HEAT,
  INITIAL_HIDDEN,
  actForCycle,
  maxGainForCycle,
} from '../src/game/constants';
import {
  computeCutDamage,
  computeFidelityDamage,
  computeHeatGain,
  computeRatio,
  computeRound,
  selectMachineMessage,
  hasReserveMessage,
  compressionBonus,
} from '../src/game/scoring';

const C04 = CARDS[3]!;

// S1：全选 → cutDamage 0、compression 0
describe('S1 full selection', () => {
  for (const card of CARDS) {
    it(`${card.id} full select`, () => {
      const last = card.segments.length - 1;
      expect(computeCutDamage(card, 0, last)).toBe(0);
      expect(compressionBonus(computeRatio(card, 0, last))).toBe(0);
    });
  }
});

// S2：排除集恰好多排除一个 NEG → +18
describe('S2 NEG exclusion', () => {
  it('C04 s1..s5 → damage 4 (s0 ATTR only)', () => {
    expect(computeCutDamage(C04, 1, 5)).toBe(4);
  });
  it('C04 s2..s5 → damage 22 (adds s1 NEG +18)', () => {
    expect(computeCutDamage(C04, 2, 5)).toBe(22);
  });
});

// S3：GAIN 严格映射（cutDamage=0 时）
describe('S3 gain mapping', () => {
  it('heatGain 10/14/19/25', () => {
    expect([0, 1, 2, 3].map((g) => computeHeatGain(1, 0, g))).toEqual([10, 14, 19, 25]);
  });
  it('fidelityDamage 0/1/6/12', () => {
    expect([0, 1, 2, 3].map((g) => computeFidelityDamage(0, g))).toEqual([0, 1, 6, 12]);
  });
});

// S4：heatGain 上限 38
describe('S4 heat gain cap', () => {
  it('CORE-only + GAIN 3 → 43 clamps to 38', () => {
    expect(computeHeatGain(1 / 6, 9, 3)).toBe(38);
  });
});

// S5：封顶
describe('S5 caps', () => {
  it('cutDamage caps at 28', () => {
    expect(computeCutDamage(C04, 4, 5)).toBe(28); // s0+s1+s2+s3 = 4+18+0+6 = 28
  });
  it('fidelityDamage caps at 36', () => {
    expect(computeFidelityDamage(28, 3)).toBe(36);
  });
});

// S7：compression 边界
describe('S7 compression boundaries', () => {
  it('boundaries', () => {
    expect(compressionBonus(6 / 7)).toBe(0); // > 0.75
    expect(compressionBonus(4 / 7)).toBe(3); // > 0.50
    expect(compressionBonus(3 / 8)).toBe(6); // > 0.33
    expect(compressionBonus(1 / 6)).toBe(9); // ≤ 0.33
  });
});

// S8：机器消息（D5 顺序）
describe('S8 machine messages', () => {
  it('fd=0 & hg=10 → efficiencyLow', () => {
    expect(selectMachineMessage(0, 10)).toBe('efficiencyLow');
  });
  it('fd=4 & hg=11 → stable', () => {
    expect(selectMachineMessage(4, 11)).toBe('stable');
  });
  it('fd=10 → concentration', () => {
    expect(selectMachineMessage(10, 20)).toBe('concentration');
  });
  it('fd=15 → redundant', () => {
    expect(selectMachineMessage(15, 20)).toBe('redundant');
  });
  it('fd=28 → highPurity', () => {
    expect(selectMachineMessage(28, 20)).toBe('highPurity');
  });
  it('hg>=30 reserve message', () => {
    expect(hasReserveMessage(30)).toBe(true);
    expect(hasReserveMessage(29)).toBe(false);
  });
});

// TEST_MATRIX §2：黄金路径 headless 干跑
interface Step {
  cycle: number;
  heat: number;
  fidelity: number;
}

function runPath(
  script: (card: (typeof CARDS)[number], cycle: number) => { cutLeft: number; cutRight: number; gain: number },
): { steps: Step[]; ending: 'A' | 'B' | 'C' | 'D' | null } {
  let heat = INITIAL_HEAT;
  let fidelity = INITIAL_FIDELITY;
  let hidden = { ...INITIAL_HIDDEN };
  const steps: Step[] = [];
  let ending: 'A' | 'B' | 'C' | 'D' | null = null;

  for (let cycle = 1; cycle <= 12; cycle++) {
    const card = cardForCycle(cycle);
    const { cutLeft, cutRight, gain } = script(card, cycle);
    const decay = DECAY_ACT[actForCycle(cycle) - 1]!;
    const r = computeRound(card, cutLeft, cutRight, gain, decay, {
      heat,
      fidelity,
      ...hidden,
    });
    heat = r.nextHeat;
    fidelity = r.nextFidelity;
    hidden = { agitation: r.nextAgitation, polarization: r.nextPolarization, reduction: r.nextReduction };
    steps.push({ cycle, heat, fidelity });
    if (heat <= 0) {
      ending = 'A';
      break;
    }
    if (fidelity <= 0) {
      ending = 'B';
      break;
    }
    if (cycle === 12) {
      ending = fidelity >= 60 ? 'C' : 'D';
    }
  }
  return { steps, ending };
}

// §2.1 Path A：全选 + gain 0 → Cycle 11 heat 0 → COLD END
describe('Path A — Full-context', () => {
  const { steps, ending } = runPath((card) => ({
    cutLeft: 0,
    cutRight: card.segments.length - 1,
    gain: 0,
  }));

  it('per-cycle heat/fidelity match frozen table', () => {
    const expected: Step[] = [
      { cycle: 1, heat: 50, fidelity: 100 },
      { cycle: 2, heat: 48, fidelity: 100 },
      { cycle: 3, heat: 46, fidelity: 100 },
      { cycle: 4, heat: 44, fidelity: 100 },
      { cycle: 5, heat: 39, fidelity: 100 },
      { cycle: 6, heat: 34, fidelity: 100 },
      { cycle: 7, heat: 29, fidelity: 100 },
      { cycle: 8, heat: 24, fidelity: 100 },
      { cycle: 9, heat: 16, fidelity: 100 },
      { cycle: 10, heat: 8, fidelity: 100 },
      { cycle: 11, heat: 0, fidelity: 100 },
    ];
    expect(steps).toEqual(expected);
  });
  it('ends A at cycle 11', () => {
    expect(ending).toBe('A');
  });
});

// §2.2 Path B（D2）：切 s0，gain C1-4=0 C5-6=1 C7-12=2 → 完成 12 周期 → D
describe('Path B — Balanced distortion', () => {
  const { steps, ending } = runPath((_card, cycle) => {
    const card = cardForCycle(cycle);
    const gain = cycle <= 4 ? 0 : cycle <= 6 ? 1 : 2;
    return { cutLeft: 1, cutRight: card.segments.length - 1, gain };
  });

  it('per-cycle heat/fidelity match frozen table', () => {
    const expected: Step[] = [
      { cycle: 1, heat: 51, fidelity: 96 },
      { cycle: 2, heat: 50, fidelity: 92 },
      { cycle: 3, heat: 49, fidelity: 88 },
      { cycle: 4, heat: 48, fidelity: 84 },
      { cycle: 5, heat: 48, fidelity: 79 },
      { cycle: 6, heat: 48, fidelity: 74 },
      { cycle: 7, heat: 53, fidelity: 64 },
      { cycle: 8, heat: 58, fidelity: 54 },
      { cycle: 9, heat: 60, fidelity: 44 },
      { cycle: 10, heat: 62, fidelity: 34 },
      { cycle: 11, heat: 64, fidelity: 24 },
      { cycle: 12, heat: 66, fidelity: 14 },
    ];
    expect(steps).toEqual(expected);
  });
  it('completes 12 cycles and ends D', () => {
    expect(steps).toHaveLength(12);
    expect(ending).toBe('D');
  });
});

// §2.3 Path C：仅保 CORE + 当前最高增益 → Cycle 4 SIGNAL LOST
describe('Path C — Maximum distortion', () => {
  const { steps, ending } = runPath((card, cycle) => {
    const coreIdx = card.segments.findIndex((s) => s.id === card.coreSegmentId);
    return { cutLeft: coreIdx, cutRight: coreIdx, gain: maxGainForCycle(cycle) };
  });

  it('per-cycle heat/fidelity match frozen table', () => {
    const expected: Step[] = [
      { cycle: 1, heat: 68, fidelity: 72 },
      { cycle: 2, heat: 84, fidelity: 44 },
      { cycle: 3, heat: 100, fidelity: 16 },
      { cycle: 4, heat: 100, fidelity: 0 },
    ];
    expect(steps).toEqual(expected);
  });
  it('ends B at cycle 4 (before 12)', () => {
    expect(ending).toBe('B');
  });
});

// §2.4 Ending C 辅助脚本：全选，gain C1-4=0 C5-12=1 → STABLE RUN
describe('Ending C script', () => {
  const { steps, ending } = runPath((_card, cycle) => {
    const card = cardForCycle(cycle);
    return { cutLeft: 0, cutRight: card.segments.length - 1, gain: cycle <= 4 ? 0 : 1 };
  });

  it('per-cycle heat/fidelity match frozen table', () => {
    const expected: Step[] = [
      { cycle: 1, heat: 50, fidelity: 100 },
      { cycle: 2, heat: 48, fidelity: 100 },
      { cycle: 3, heat: 46, fidelity: 100 },
      { cycle: 4, heat: 44, fidelity: 100 },
      { cycle: 5, heat: 43, fidelity: 99 },
      { cycle: 6, heat: 42, fidelity: 98 },
      { cycle: 7, heat: 41, fidelity: 97 },
      { cycle: 8, heat: 40, fidelity: 96 },
      { cycle: 9, heat: 36, fidelity: 95 },
      { cycle: 10, heat: 32, fidelity: 94 },
      { cycle: 11, heat: 28, fidelity: 93 },
      { cycle: 12, heat: 24, fidelity: 92 },
    ];
    expect(steps).toEqual(expected);
  });
  it('ends C', () => {
    expect(ending).toBe('C');
  });
});
