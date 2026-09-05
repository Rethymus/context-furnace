// DESIGN_SPEC §18.6：GameState 唯一事实源；D9/D10/D33 裁决。
import {
  INITIAL_FIDELITY,
  INITIAL_HEAT,
  INITIAL_HIDDEN,
  TOTAL_CYCLES,
  actForCycle,
  maxGainForCycle,
} from './constants';
import type { Card, Ending, GameState, RoundResult } from './types';

export function createInitialState(): GameState {
  return {
    phase: 'BOOT',
    cycle: 1,
    act: 1,
    heat: INITIAL_HEAT, /* §9.1 = 52 */
    fidelity: INITIAL_FIDELITY, /* §9.1 = 100 */
    agitation: INITIAL_HIDDEN.agitation,
    polarization: INITIAL_HIDDEN.polarization,
    reduction: INITIAL_HIDDEN.reduction,
    cutLeft: 0,
    cutRight: 0,
    gain: 0, // D9：每次开机重置 0
    peakHeat: INITIAL_HEAT, // D10
    totalCutRatio: 0, // D4
    roundsCompleted: 0, // D4
    highestGain: 0,
    ending: null,
  };
}

// D9：每次 LOAD 选区重置为全选
export function loadRound(state: GameState, card: Card): GameState {
  return {
    ...state,
    cutLeft: 0,
    cutRight: card.segments.length - 1,
    gain: Math.min(state.gain, maxGainForCycle(state.cycle)),
  };
}

export function setCut(state: GameState, left: number, right: number): GameState {
  if (state.phase !== 'ROUND_EDITING') return state; // T4：非编辑状态静默无效
  return { ...state, cutLeft: left, cutRight: right };
}

export function setGain(state: GameState, value: number): GameState {
  if (state.phase !== 'ROUND_EDITING') return state; // T4
  const max = maxGainForCycle(state.cycle); // T5：解锁时刻表
  if (value < 0 || value > max) return state;
  return { ...state, gain: value, highestGain: Math.max(state.highestGain, value) };
}

// §17.2 CORE 硬规则：选区必须包含 CORE
export function hasCoreSelected(card: Card, cutLeft: number, cutRight: number): boolean {
  const idx = card.segments.findIndex((s) => s.id === card.coreSegmentId);
  return idx >= cutLeft && idx <= cutRight;
}

// §9.4 最终资源计算 + §9.6 隐藏状态 + D4/D10 统计
export function applyRoundResult(state: GameState, result: RoundResult): GameState {
  const heat = result.nextHeat;
  const fidelity = result.nextFidelity;
  return {
    ...state,
    heat,
    fidelity,
    agitation: result.nextAgitation,
    polarization: result.nextPolarization,
    reduction: result.nextReduction,
    peakHeat: Math.max(state.peakHeat, heat), // D10
    totalCutRatio: state.totalCutRatio + (1 - result.ratio), // D4
    roundsCompleted: state.roundsCompleted + 1,
  };
}

// D4：平均切除比例（百分数取整）
export function averageCutPercent(state: GameState): number {
  if (state.roundsCompleted === 0) return 0;
  return Math.round((state.totalCutRatio / state.roundsCompleted) * 100);
}

// §13 触发优先级：A(heat≤0) → B(fidelity≤0) → C/D（仅 Cycle 12 完成后）
export function evaluateEnding(state: GameState): Ending {
  if (state.heat <= 0) return 'A';
  if (state.fidelity <= 0) return 'B';
  if (state.cycle >= TOTAL_CYCLES && state.roundsCompleted >= state.cycle) {
    return state.fidelity >= 60 ? 'C' : 'D'; /* §13 C/D */
  }
  return null;
}

export function nextAct(state: GameState): 1 | 2 | 3 {
  return actForCycle(state.cycle);
}
