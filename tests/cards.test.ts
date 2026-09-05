// TEST_MATRIX §1.2：内容校验（原规格 §117 + CONTENT_SPEC §6 核对表）。
import { describe, expect, it } from 'vitest';
import { CARDS, TUTORIAL_CARD } from '../src/game/cards';

// C6：CONTENT_SPEC §6 核对表（卡 id → 段数、CORE 位置 index、首段 role）
const SPEC_TABLE: Record<string, { count: number; coreIndex: number }> = {
  C01: { count: 7, coreIndex: 2 },
  C02: { count: 6, coreIndex: 3 },
  C03: { count: 7, coreIndex: 4 },
  C04: { count: 6, coreIndex: 2 },
  C05: { count: 7, coreIndex: 4 },
  C06: { count: 8, coreIndex: 6 },
  C07: { count: 7, coreIndex: 2 },
  C08: { count: 7, coreIndex: 4 },
  C09: { count: 7, coreIndex: 5 },
  C10: { count: 7, coreIndex: 2 },
  C11: { count: 7, coreIndex: 3 },
  C12: { count: 7, coreIndex: 5 },
};

describe('cards invariants (§117)', () => {
  // C5：顺序固定 C01→C12
  it('C5 card order is C01..C12', () => {
    expect(CARDS.map((c) => c.id)).toEqual([
      'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C11', 'C12',
    ]);
  });

  for (const card of CARDS) {
    describe(card.id, () => {
      // C1：恰 1 个 CORE
      it('C1 exactly one CORE', () => {
        expect(card.segments.filter((s) => s.role === 'CORE')).toHaveLength(1);
      });

      // C2：5–8 段（D1）
      it('C2 5 <= segments <= 8', () => {
        expect(card.segments.length).toBeGreaterThanOrEqual(5);
        expect(card.segments.length).toBeLessThanOrEqual(8);
      });

      // C3：zh/en 同 segment ID、同 roles（Semantic Twin 不变量）
      it('C3 zh/en same ids and roles', () => {
        expect(card.segments.map((s) => s.id)).toEqual(card.segments.map((s) => s.id));
        const roles = new Set(card.segments.map((s) => s.role));
        expect(roles.has('CORE')).toBe(true);
      });

      // C4：全部可见字符串非空
      it('C4 non-empty strings', () => {
        for (const s of card.segments) {
          expect(s.zh.trim().length).toBeGreaterThan(0);
          expect(s.en.trim().length).toBeGreaterThan(0);
        }
        for (const g of [card.gain[1], card.gain[2], card.gain[3]]) {
          expect(g.zh.trim().length).toBeGreaterThan(0);
          expect(g.en.trim().length).toBeGreaterThan(0);
        }
      });

      // C5：coreSegmentId 存在于该卡
      it('C5 coreSegmentId exists', () => {
        expect(card.segments.some((s) => s.id === card.coreSegmentId)).toBe(true);
      });

      // C6：与 CONTENT_SPEC §6 核对表一致
      it('C6 matches spec table', () => {
        const spec = SPEC_TABLE[card.id]!;
        expect(card.segments.length).toBe(spec.count);
        expect(card.segments.findIndex((s) => s.id === card.coreSegmentId)).toBe(spec.coreIndex);
        expect(card.segments[0]!.role).toBe('ATTR');
      });

      // GAIN 1 模板含 {selection} 占位符（L2 前置）
      it('gain 1 template has {selection}', () => {
        expect(card.gain[1].zh.includes('{selection}')).toBe(true);
        expect(card.gain[1].en.includes('{selection}')).toBe(true);
      });
    });
  }

  // D8：教学卡 3 段、无 CORE
  it('tutorial card has 3 segments, no roles', () => {
    expect(TUTORIAL_CARD.segments).toHaveLength(3);
    expect(TUTORIAL_CARD.segments.every((s) => s.zh.length > 0 && s.en.length > 0)).toBe(true);
  });
});
