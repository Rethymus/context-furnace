// PRESENTATION_SPEC §30：展示面检查（P1–P6），verify 第 12 项。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const FROZEN_DESCRIPTION =
  'Context Furnace (断章取火器) — a compact bilingual browser game about cutting and refining text inside a fictional laboratory machine.';

// §2：受检词汇 fixtures 以运行期物化形式携带（v1.1.1 所有者卫生裁定），
// 不在源码字面层展开；解码结果与 v1.0 词表逐字一致。
const fixtures = (encoded: string): string[] =>
  Buffer.from(encoded, 'base64').toString('utf8').split('|');

const BANNED_ZH = fixtures(
  '6K695Yi6fOaal+iuvXzlvbHlsIR86Ieq5aqS5L2TfOaWsOmXu+WtpnzmlrDpl7vlqpLkvZN85aqS5L2T5Lmx6LGhfOaXoOiJr+WqkuS9k3zlgYfmlrDpl7t86YCg6LCjfOaWreeroOWPluS5iXzmoIfpopjlhZp85byV5oiYfOiIhuiuuuaTjee6tXzkv6Hmga/mk43nurV86aKg5YCS6buR55m9fOaMh+m5v+S4uumprHznianljJZ8576k5L2T5a+556uLfOaMkei1t+Wvueeri3zkvKDmkq3mk43nurV85paw6Ze75a2m6a2F5Yqb',
);
const BANNED_EN = fixtures(
  'c2F0aXJlfHNhdGlyaWNhbHxwYXJvZHkgb2YgbWVkaWF8bWlzaW5mb3JtYXRpb258ZGlzaW5mb3JtYXRpb258ZmFrZSBuZXdzfGpvdXJuYWxpc218bmV3cyBtZWRpYXxwcm9wYWdhbmRhfGNsaWNrYmFpdHxtZWRpYSBtYW5pcHVsYXRpb258aW5mb3JtYXRpb24gbWFuaXB1bGF0aW9ufHBvbGFyaXphdGlvbnxjb250ZXh0b215fG91dC1vZi1jb250ZXh0fGZyYW1pbmcgYmlhc3xjdWx0dXJlIHdhcg==',
);

const readmeEn = readFileSync(join(ROOT, 'README.md'), 'utf8');
const readmeZh = readFileSync(join(ROOT, 'README.zh-CN.md'), 'utf8');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const metadata = JSON.parse(readFileSync(join(ROOT, '.github', 'repository-metadata.json'), 'utf8'));
const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');

// P1：禁用词
describe('P1 banned terms on public surface', () => {
  const surfaces: Array<[string, string]> = [
    ['README.md', readmeEn],
    ['README.zh-CN.md', readmeZh],
    ['package.json(description)', String(pkg.description)],
    ['repository-metadata.json(description)', String(metadata.description)],
    ['index.html', indexHtml],
  ];
  for (const [name, text] of surfaces) {
    it(`${name} is free of banned terms`, () => {
      const hits: string[] = [];
      for (const term of BANNED_ZH) if (text.includes(term)) hits.push(term);
      for (const term of BANNED_EN) {
        if (new RegExp(`\\b${term.replace(/[-\s]/g, '[-\\s]')}\\b`, 'i').test(text)) hits.push(term);
      }
      expect(hits, `${name} contains banned terms: ${hits.join(', ')}`).toEqual([]);
    });
  }
});

// P2：description 逐字全等
describe('P2 frozen description', () => {
  it('package.json description matches verbatim', () => {
    expect(pkg.description).toBe(FROZEN_DESCRIPTION);
  });
  it('repository-metadata.json description matches verbatim', () => {
    expect(metadata.description).toBe(FROZEN_DESCRIPTION);
  });
  it('repository name is context-furnace (D36)', () => {
    expect(metadata.name).toBe('context-furnace');
    expect(pkg.name).toBe('context-furnace');
  });
});

// P3：H2 allowlist（顺序一致）
describe('P3 README section allowlist', () => {
  const EN_H2 = [
    'Play', 'Overview', 'How to Play', 'Screenshots', 'Controls', 'Languages',
    'Technology', 'Run Locally', 'Testing', 'Project Scope', 'License',
  ];
  const ZH_H2 = [
    '开始游戏', '游戏简介', '怎么玩', '游戏截图', '操作', '语言',
    '技术栈', '本地运行', '测试', '项目范围', '许可证',
  ];
  it('README.md H2 set matches', () => {
    const h2 = [...readmeEn.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(h2).toEqual(EN_H2);
  });
  it('README.zh-CN.md H2 set matches', () => {
    const h2 = [...readmeZh.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(h2).toEqual(ZH_H2);
  });
});

// P4：媒体存在与规格
function pngSize(buf: Buffer): { width: number; height: number } {
  // PNG IHDR：宽 16–20、高 20–24（大端）
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('P4 media assets', () => {
  const mediaDir = join(ROOT, 'docs', 'media');
  it('all thirteen assets exist', () => {
    for (const f of [
      join(mediaDir, 'readme', 'gameplay.gif'),
      join(mediaDir, 'readme', 'gameplay-zh.gif'),
      join(mediaDir, 'readme', 'switch-en.gif'),
      join(mediaDir, 'readme', 'switch-zh.gif'),
      join(mediaDir, 'readme', 'boot-en.png'),
      join(mediaDir, 'readme', 'boot-zh.png'),
      join(mediaDir, 'readme', 'machine-zh.png'),
      join(mediaDir, 'readme', 'machine-en.png'),
      join(mediaDir, 'readme', 'settings-zh.png'),
      join(mediaDir, 'readme', 'settings-en.png'),
      join(mediaDir, 'readme', 'result-zh.png'),
      join(mediaDir, 'readme', 'result-en.png'),
      join(mediaDir, 'social-preview.png'),
    ]) {
      expect(() => readFileSync(f), `${f} missing`).not.toThrow();
    }
  });
  it('size budgets (gifs ≤4MB, screenshots and banners ≤1.5MB, social ≤1MB)', () => {
    for (const f of ['gameplay.gif', 'gameplay-zh.gif', 'switch-en.gif', 'switch-zh.gif']) {
      expect(readFileSync(join(mediaDir, 'readme', f)).length).toBeLessThanOrEqual(4 * 1024 * 1024);
    }
    for (const f of [
      'machine-zh.png', 'machine-en.png', 'boot-zh.png', 'boot-en.png',
      'settings-zh.png', 'settings-en.png', 'result-zh.png', 'result-en.png',
    ]) {
      expect(readFileSync(join(mediaDir, 'readme', f)).length).toBeLessThanOrEqual(1.5 * 1024 * 1024);
    }
    expect(readFileSync(join(mediaDir, 'social-preview.png')).length).toBeLessThanOrEqual(1024 * 1024);
  });
  it('social preview is 1280×640', () => {
    const { width, height } = pngSize(readFileSync(join(mediaDir, 'social-preview.png')));
    expect(width).toBe(1280);
    expect(height).toBe(640);
  });
});

// P5：README 相对路径引用完整且语言一一对应；禁绝对 raw 链接
describe('P5 media references', () => {
  it('README.md references the English-UI assets via relative paths', () => {
    for (const f of [
      'gameplay.gif', 'boot-en.png', 'machine-zh.png', 'machine-en.png',
      'result-en.png', 'settings-en.png', 'switch-en.gif',
    ]) {
      expect(readmeEn).toContain(`./docs/media/readme/${f}`);
    }
    expect(readmeEn.includes('raw.githubusercontent.com')).toBe(false);
  });
  it('README.zh-CN.md references the Chinese-UI assets via relative paths', () => {
    for (const f of [
      'gameplay-zh.gif', 'boot-zh.png', 'machine-zh.png', 'machine-en.png',
      'result-zh.png', 'settings-zh.png', 'switch-zh.gif',
    ]) {
      expect(readmeZh).toContain(`./docs/media/readme/${f}`);
    }
    expect(readmeZh.includes('raw.githubusercontent.com')).toBe(false);
  });
  it('language-specific media is not cross-referenced', () => {
    // §11：各语言版本的动图、头图与 v1.2 新增媒体必须与语言一一对应（machine-* 双语共用除外）
    for (const f of ['gameplay-zh.gif', 'boot-zh.png', 'switch-zh.gif', 'result-zh.png', 'settings-zh.png']) {
      expect(readmeEn.includes(`./docs/media/readme/${f}`)).toBe(false);
    }
    for (const f of ['gameplay.gif', 'boot-en.png', 'switch-en.gif', 'result-en.png', 'settings-en.png']) {
      expect(readmeZh.includes(`./docs/media/readme/${f}`)).toBe(false);
    }
  });
});

// P6：index.html 不含 meta description / OG（D41）
describe('P6 page meta policy', () => {
  it('index.html has no meta description or OG tags', () => {
    expect(/<meta[^>]+name=["']description["']/i.test(indexHtml)).toBe(false);
    expect(/<meta[^>]+property=["']og:/i.test(indexHtml)).toBe(false);
  });
});
