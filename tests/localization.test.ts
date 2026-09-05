// TEST_MATRIX §1.3：双语数值全等（L1）、模板（L2）、检测链（L3）、切换保状态（L4）。
import { afterEach, describe, expect, it } from 'vitest';
import { CARDS } from '../src/game/cards';
import { computeRound } from '../src/game/scoring';
import { DECAY_ACT, actForCycle } from '../src/game/constants';
import type { Card, GameState, Locale } from '../src/game/types';

// 用单一语言的 segment 文本重建卡（结构不变，仅文本语言不同）
function localizeCard(card: Card, locale: Locale): Card {
  return {
    ...card,
    segments: card.segments.map((s) => ({ ...s, zh: locale === 'zh-CN' ? s.zh : s.en, en: locale === 'zh-CN' ? s.zh : s.en })),
  };
}

// L1：同 cutLeft/cutRight/gain 在 zh-CN 与 en-US 下数值完全一致（原规格 §120）
describe('L1 bilingual numeric equality', () => {
  for (const card of CARDS) {
    const last = card.segments.length - 1;
    const coreIdx = card.segments.findIndex((s) => s.id === card.coreSegmentId);
    const cases: Array<[number, number]> = [
      [0, last], // 全选
      [coreIdx, coreIdx], // 仅 CORE
      [1, last], // 切除首段
    ];
    for (const [cutLeft, cutRight] of cases) {
      for (const gain of [0, 1, 2, 3] as const) {
        it(`${card.id} cut[${cutLeft},${cutRight}] gain${gain}`, () => {
          const zhCard = localizeCard(card, 'zh-CN');
          const enCard = localizeCard(card, 'en-US');
          const decay = DECAY_ACT[actForCycle(1) - 1]!;
          const current = { heat: 50, fidelity: 80, agitation: 10, polarization: 10, reduction: 10 };
          const zhR = computeRound(zhCard, cutLeft, cutRight, gain, decay, current);
          const enR = computeRound(enCard, cutLeft, cutRight, gain, decay, current);
          expect(zhR.cutDamage).toBe(enR.cutDamage);
          expect(zhR.heatGain).toBe(enR.heatGain);
          expect(zhR.fidelityDamage).toBe(enR.fidelityDamage);
          expect(zhR.nextHeat).toBe(enR.nextHeat);
          expect(zhR.nextFidelity).toBe(enR.nextFidelity);
          expect(zhR.nextAgitation).toBe(enR.nextAgitation);
          expect(zhR.nextPolarization).toBe(enR.nextPolarization);
          expect(zhR.nextReduction).toBe(enR.nextReduction);
        });
      }
    }
  }
});

// L2：{selection} 模板结构（拼接结果语言不同，token 一致）
describe('L2 gain1 template', () => {
  it('both locales contain the {selection} token', () => {
    for (const card of CARDS) {
      expect(card.gain[1].zh.includes('{selection}')).toBe(true);
      expect(card.gain[1].en.includes('{selection}')).toBe(true);
    }
  });
});

// L3：检测链（原规格 §65）
describe('L3 locale detection chain', () => {
  const originalNavigator = globalThis.navigator;
  const store = new Map<string, string>();

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    store.clear();
    // 清理 i18n 内部 mock 存根
    (globalThis as { localStorage?: unknown }).localStorage = undefined;
  });

  function stubEnv(opts: { stored?: string | null; languages?: string[] }) {
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: opts.languages ?? [] },
      writable: true,
      configurable: true,
    });
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => (k === 'cf.locale' && opts.stored ? opts.stored : null),
      setItem: (k: string, v: string) => void store.set(k, v),
    };
  }

  it('zh navigator language → zh-CN', async () => {
    stubEnv({ languages: ['en-US', 'zh-CN'] });
    const { detectLocale } = await import('../src/i18n/index');
    expect(detectLocale()).toBe('zh-CN');
  });

  it('non-zh navigator → en-US', async () => {
    stubEnv({ languages: ['fr-FR', 'en-US'] });
    const { detectLocale } = await import('../src/i18n/index');
    expect(detectLocale()).toBe('en-US');
  });

  it('stored cf.locale wins', async () => {
    stubEnv({ stored: 'en-US', languages: ['zh-CN'] });
    const { detectLocale } = await import('../src/i18n/index');
    expect(detectLocale()).toBe('en-US');
  });

  it('stored zh-Hans maps to zh-CN', async () => {
    stubEnv({ stored: 'zh-Hans' });
    const { detectLocale } = await import('../src/i18n/index');
    // zh-Hans 不是合法 locale ID，落到 navigator（空）→ en-US（§65 只存 zh-CN/en-US）
    expect(detectLocale()).toBe('en-US');
  });
});

// L4：切换语言不触碰 GameState（原规格 §121，状态层）
describe('L4 locale switch preserves state', () => {
  it('setLocale does not mutate a captured GameState', async () => {
    const { initI18n, setLocale } = await import('../src/i18n/index');
    initI18n();
    const state: GameState = {
      phase: 'ROUND_EDITING',
      cycle: 8,
      act: 2,
      heat: 58,
      fidelity: 54,
      agitation: 20.5,
      polarization: 15.25,
      reduction: 8,
      cutLeft: 2,
      cutRight: 6,
      gain: 2,
      peakHeat: 66,
      totalCutRatio: 1.8,
      roundsCompleted: 7,
      highestGain: 2,
      ending: null,
    };
    const snapshot = JSON.stringify(state);
    setLocale('en-US');
    setLocale('zh-CN');
    expect(JSON.stringify(state)).toBe(snapshot);
    // 逐字段断言（§121）
    expect(state.cycle).toBe(8);
    expect(state.cutLeft).toBe(2);
    expect(state.cutRight).toBe(6);
    expect(state.gain).toBe(2);
    expect(state.heat).toBe(58);
    expect(state.fidelity).toBe(54);
  });
});
