// DESIGN_SPEC §9: 数值系统（全冻结，禁止调参）。每个魔数标注出处。
import type { Role } from './types';

export const TOTAL_CYCLES = 12; // 原规格 §4

// §9.1 初始化
export const INITIAL_HEAT = 52;
export const INITIAL_FIDELITY = 100;
export const INITIAL_HIDDEN = { agitation: 0, polarization: 0, reduction: 0 };

// §9.2 每阶段热损耗 decay
export const DECAY_ACT = [12, 15, 18] as const; // Act 1 / 2 / 3

// §9.3 CUT Damage Weight
export const ROLE_PENALTY: Record<Role, number> = {
  ATTR: 4,
  CONTEXT: 4,
  TIME: 6,
  SCOPE: 8,
  BASE: 8,
  QUAL: 9,
  MODAL: 9,
  CONTRAST: 10,
  CONDITION: 10,
  CAUSE: 12,
  NEG: 18,
  CORE: 0,
};

// §9.4 公式封顶
export const CUT_DAMAGE_CAP = 28;
export const FIDELITY_DAMAGE_CAP = 36;
export const HEAT_GAIN_MIN = 0;
export const HEAT_GAIN_MAX = 38;
export const HEAT_GAIN_BASE = 10;
export const CONTEXT_HEAT_CAP = 10;
export const CONTEXT_HEAT_FACTOR = 0.35;

// §9.4 compression bonus 表：ratio > 0.75 → 0；> 0.50 → 3；> 0.33 → 6；≤ 0.33 → 9
export function compressionBonus(ratio: number): number {
  if (ratio > 0.75) return 0;
  if (ratio > 0.5) return 3;
  if (ratio > 0.33) return 6;
  return 9;
}

// §9.5 Gain 数值（index = gain 档位）
export const GAIN_HEAT_BONUS = [0, 4, 9, 15] as const;
export const GAIN_FIDELITY_PENALTY = [0, 1, 6, 12] as const;

// §9.6 隐藏状态：按 GAIN 档位的增量
export const GAIN_HIDDEN: Record<1 | 2 | 3, { agitation: number; polarization: number; reduction: number }> = {
  1: { agitation: 6, polarization: 0, reduction: 0 },
  2: { agitation: 3, polarization: 4, reduction: 4 },
  3: { agitation: 4, polarization: 9, reduction: 11 },
};
// §9.6 恒有项
export const AGITATION_FROM_HEAT_FACTOR = 0.3; // agitation += max(0, heatGain − 20) × 0.3
export const AGITATION_FROM_HEAT_THRESHOLD = 20;
export const POLARIZATION_FROM_CUT_FACTOR = 0.15; // polarization += cutDamage × 0.15

// §27 GAIN 解锁时刻表（最高可用档位）
export function maxGainForCycle(cycle: number): 0 | 1 | 2 | 3 {
  if (cycle <= 4) return 0;
  if (cycle <= 6) return 1;
  if (cycle <= 8) return 2;
  return 3;
}

// §72–73 三个 Act / Current Load
export function actForCycle(cycle: number): 1 | 2 | 3 {
  if (cycle <= 4) return 1;
  if (cycle <= 8) return 2;
  return 3;
}

export const HEAT_HIGH_THRESHOLD = 90; // §16 heat ≥ 90 低频共振
export const HEAT_RESERVE_THRESHOLD = 30; // §12 heatGain ≥ 30 附加「优质燃料」
export const MAX_GAIN = 3;
