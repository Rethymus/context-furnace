// DESIGN_SPEC §18.7: content types (Semantic Twin, 原规格 §115).

export type Role =
  | 'ATTR'
  | 'CONTEXT'
  | 'TIME'
  | 'SCOPE'
  | 'BASE'
  | 'QUAL'
  | 'MODAL'
  | 'CONTRAST'
  | 'CONDITION'
  | 'CAUSE'
  | 'NEG'
  | 'CORE';

export interface Segment {
  id: string;
  role: Role;
  zh: string;
  en: string;
}

export interface GainText {
  zh: string;
  en: string;
}

export interface Card {
  id: string;
  segments: Segment[];
  coreSegmentId: string;
  gain: { 1: GainText; 2: GainText; 3: GainText };
}

// 教学卡：3 段、无 roles、无 CORE 约束（D8）。
export interface TutorialCard {
  id: 'TUTORIAL';
  segments: { id: string; zh: string; en: string }[];
}

export type Phase =
  | 'BOOT'
  | 'HOME_OFF'
  | 'BOOTING'
  | 'TUTORIAL'
  | 'ROUND_EDITING'
  | 'ROUND_BURNING'
  | 'ROUND_RESULT'
  | 'ENDING';

export type Ending = 'A' | 'B' | 'C' | 'D' | 'E' | null;

export type Locale = 'zh-CN' | 'en-US';

// DESIGN_SPEC §18.6: GameState 唯一事实源。UI 不得自行计算任何分数。
export interface GameState {
  phase: Phase;
  cycle: number; // 1–12
  act: number; // 1–3
  heat: number;
  fidelity: number;
  agitation: number; // 隐藏
  polarization: number; // 隐藏
  reduction: number; // 隐藏
  cutLeft: number; // 选区左边界（segment index，含）
  cutRight: number; // 选区右边界（segment index，含）
  gain: number; // 0–3，受解锁时刻表约束
  peakHeat: number; // D10
  totalCutRatio: number; // 每轮 (1−ratio) 累积器（D4）
  roundsCompleted: number; // D4 平均切除比例的分母
  highestGain: number;
  ending: Ending;
}

// 一轮结算的完整数值（scoring.ts 产出，state.ts 消费）。
export interface RoundResult {
  cutDamage: number;
  ratio: number;
  compressionBonus: number;
  contextHeat: number;
  gainHeatBonus: number;
  gainFidelityPenalty: number;
  heatGain: number;
  fidelityDamage: number;
  nextHeat: number;
  nextFidelity: number;
  nextAgitation: number;
  nextPolarization: number;
  nextReduction: number;
}
