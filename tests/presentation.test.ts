// PRESENTATION_SPEC §30：展示面检查（P1–P6），verify 第 12 项。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const FROZEN_DESCRIPTION =
  'Context Furnace (断章取火器) — a compact bilingual browser game about cutting and refining text inside a fictional laboratory machine.';

// §2 禁用词（仅检查公共展示面文件）
const BANNED_ZH = [
  '讽刺', '暗讽', '影射', '自媒体', '新闻学', '新闻媒体', '媒体乱象', '无良媒体',
  '假新闻', '造谣', '断章取义', '标题党', '引战', '舆论操纵', '信息操纵',
  '颠倒黑白', '指鹿为马', '物化', '群体对立', '挑起对立', '传播操纵', '新闻学魅力',
];
const BANNED_EN = [
  'satire', 'satirical', 'parody of media', 'misinformation', 'disinformation',
  'fake news', 'journalism', 'news media', 'propaganda', 'clickbait',
  'media manipulation', 'information manipulation', 'polarization',
  'contextomy', 'out-of-context', 'framing bias', 'culture war',
];

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
  it('all four assets exist', () => {
    for (const f of [
      join(mediaDir, 'readme', 'gameplay.gif'),
      join(mediaDir, 'readme', 'machine-zh.png'),
      join(mediaDir, 'readme', 'machine-en.png'),
      join(mediaDir, 'social-preview.png'),
    ]) {
      expect(() => readFileSync(f), `${f} missing`).not.toThrow();
    }
  });
  it('size budgets (gif ≤4MB, screenshots ≤1.5MB, social ≤1MB)', () => {
    const gif = readFileSync(join(mediaDir, 'readme', 'gameplay.gif'));
    expect(gif.length).toBeLessThanOrEqual(4 * 1024 * 1024);
    for (const f of ['machine-zh.png', 'machine-en.png']) {
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

// P5：README 相对路径引用完整；禁绝对 raw 链接
describe('P5 media references', () => {
  it('both READMEs reference the three assets via relative paths', () => {
    for (const text of [readmeEn, readmeZh]) {
      for (const f of ['gameplay.gif', 'machine-zh.png', 'machine-en.png']) {
        expect(text).toContain(`./docs/media/readme/${f}`);
      }
      expect(text.includes('raw.githubusercontent.com')).toBe(false);
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
