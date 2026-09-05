// DESIGN_SPEC §18.5：状态机（迁移表）；§113：非法迁移必须 throw。
import type { Ending, Phase } from './types';

const TRANSITIONS: Record<Phase, Phase[]> = {
  BOOT: ['HOME_OFF'],
  HOME_OFF: ['BOOTING'],
  BOOTING: ['TUTORIAL', 'ROUND_EDITING'],
  TUTORIAL: ['ROUND_EDITING'],
  ROUND_EDITING: ['ROUND_BURNING', 'ENDING'], // ENDING 仅限拔插头（E，cycle ≥ 9，调用方校验）
  ROUND_BURNING: ['ROUND_RESULT'],
  ROUND_RESULT: ['ROUND_EDITING', 'ENDING'],
  ENDING: ['HOME_OFF', 'BOOTING'], // 重新运行 / Replay tutorial（D12）
};

export function isLegalTransition(from: Phase, to: Phase): boolean {
  return TRANSITIONS[from].includes(to);
}

// §113：非法迁移 throw（开发模式 console error；测试 FAIL）
export function assertTransition(from: Phase, to: Phase): void {
  if (!isLegalTransition(from, to)) {
    const msg = `Illegal transition: ${from} -> ${to}`;
    console.error(msg);
    throw new Error(msg);
  }
}

// §13：结局触发优先级 A → B → C/D；E 由拔插头直接触发（调用方校验 cycle ≥ 9 与 phase）
export function endingFromPhase(state: {
  ending: Ending;
  phase: Phase;
  cycle: number;
}): Ending {
  return state.ending;
}

export function canUnplug(phase: Phase, cycle: number): boolean {
  return cycle >= 9 && (phase === 'ROUND_EDITING' || phase === 'ROUND_RESULT');
}
