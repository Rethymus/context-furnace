// DESIGN_SPEC §9: 冻结公式逐行实现；§12 机器反馈选择（D5）。
import {
  AGITATION_FROM_HEAT_FACTOR,
  AGITATION_FROM_HEAT_THRESHOLD,
  CONTEXT_HEAT_CAP,
  CONTEXT_HEAT_FACTOR,
  CUT_DAMAGE_CAP,
  FIDELITY_DAMAGE_CAP,
  GAIN_FIDELITY_PENALTY,
  GAIN_HEAT_BONUS,
  GAIN_HIDDEN,
  HEAT_GAIN_BASE,
  HEAT_GAIN_MAX,
  HEAT_GAIN_MIN,
  HEAT_RESERVE_THRESHOLD,
  POLARIZATION_FROM_CUT_FACTOR,
  ROLE_PENALTY,
  compressionBonus,
} from './constants';
import type { Card, RoundResult } from './types';

export { compressionBonus };

function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}

// GAIN 档位收敛到 0–3（表索引安全化）
function gainIndex(gain: number): 0 | 1 | 2 | 3 {
  return Math.max(0, Math.min(3, Math.round(gain))) as 0 | 1 | 2 | 3;
}

// §9.3/§9.4：cutDamage = min(28, Σ penalty(role))，求和范围＝选区之外的 guard segments
export function computeCutDamage(card: Card, cutLeft: number, cutRight: number): number {
  let sum = 0;
  card.segments.forEach((seg, i) => {
    if (i < cutLeft || i > cutRight) sum += ROLE_PENALTY[seg.role]; /* §9.3 */
  });
  return Math.min(CUT_DAMAGE_CAP, sum);
}

// §9.4：ratio = selectedSegments / totalSegments
export function computeRatio(card: Card, cutLeft: number, cutRight: number): number {
  const selected = cutRight - cutLeft + 1;
  return selected / card.segments.length;
}

// §9.4：contextHeat = min(10, floor(cutDamage × 0.35))
export function computeContextHeat(cutDamage: number): number {
  return Math.min(CONTEXT_HEAT_CAP, Math.floor(cutDamage * CONTEXT_HEAT_FACTOR));
}

// §9.4：heatGain = clamp(0, 38, 10 + compression + contextHeat + gainHeatBonus)
export function computeHeatGain(ratio: number, contextHeat: number, gain: number): number {
  const g = gainIndex(gain);
  return clamp(HEAT_GAIN_MIN, HEAT_GAIN_MAX, HEAT_GAIN_BASE + compressionBonus(ratio) + contextHeat + GAIN_HEAT_BONUS[g]); /* §9.5 */
}

// §9.4：fidelityDamage = min(36, cutDamage + gainFidelityPenalty)
export function computeFidelityDamage(cutDamage: number, gain: number): number {
  return Math.min(FIDELITY_DAMAGE_CAP, cutDamage + GAIN_FIDELITY_PENALTY[gainIndex(gain)]);
}

// §9.6：隐藏状态更新，全部 clamp 0–100
export function computeHidden(
  gain: number,
  heatGain: number,
  cutDamage: number,
  hidden: { agitation: number; polarization: number; reduction: number },
): { agitation: number; polarization: number; reduction: number } {
  const add = GAIN_HIDDEN[gain as 1 | 2 | 3] ?? { agitation: 0, polarization: 0, reduction: 0 };
  const agitation = clamp(0, 100, hidden.agitation + add.agitation + Math.max(0, heatGain - AGITATION_FROM_HEAT_THRESHOLD) * AGITATION_FROM_HEAT_FACTOR);
  const polarization = clamp(0, 100, hidden.polarization + add.polarization + cutDamage * POLARIZATION_FROM_CUT_FACTOR);
  const reduction = clamp(0, 100, hidden.reduction + add.reduction);
  return { agitation, polarization, reduction };
}

// §9 全轮结算
export function computeRound(
  card: Card,
  cutLeft: number,
  cutRight: number,
  gain: number,
  decay: number,
  current: { heat: number; fidelity: number; agitation: number; polarization: number; reduction: number },
): RoundResult {
  const g = gainIndex(gain);
  const cutDamage = computeCutDamage(card, cutLeft, cutRight);
  const ratio = computeRatio(card, cutLeft, cutRight);
  const bonus = compressionBonus(ratio);
  const contextHeat = computeContextHeat(cutDamage);
  const gainHeatBonus = GAIN_HEAT_BONUS[g];
  const heatGain = computeHeatGain(ratio, contextHeat, gain);
  const gainFidelityPenalty = GAIN_FIDELITY_PENALTY[g];
  const fidelityDamage = computeFidelityDamage(cutDamage, gain);

  const nextHeat = clamp(0, 100, current.heat - decay + heatGain);
  const nextFidelity = clamp(0, 100, current.fidelity - fidelityDamage);
  const hidden = computeHidden(gain, heatGain, cutDamage, current);

  return {
    cutDamage,
    ratio,
    compressionBonus: bonus,
    contextHeat,
    gainHeatBonus,
    gainFidelityPenalty,
    heatGain,
    fidelityDamage,
    nextHeat,
    nextFidelity,
    nextAgitation: hidden.agitation,
    nextPolarization: hidden.polarization,
    nextReduction: hidden.reduction,
  };
}

// §12 机器反馈（D5：变量为 fidelityDamage，自上而下首个匹配；heatGain≥30 为附加行）
export type MachineMessageId = 'efficiencyLow' | 'stable' | 'concentration' | 'redundant' | 'highPurity';

export function selectMachineMessage(fidelityDamage: number, heatGain: number): MachineMessageId {
  if (fidelityDamage === 0 && heatGain <= 12) return 'efficiencyLow';
  if (fidelityDamage <= 5 && heatGain <= 18) return 'stable';
  if (fidelityDamage >= 6 && fidelityDamage <= 12) return 'concentration';
  if (fidelityDamage >= 13 && fidelityDamage <= 20) return 'redundant';
  return 'highPurity';
}

export function hasReserveMessage(heatGain: number): boolean {
  return heatGain >= HEAT_RESERVE_THRESHOLD;
}
