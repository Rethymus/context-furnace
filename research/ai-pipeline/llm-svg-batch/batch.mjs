// LLM 直写 SVG 候选库批量闸门：色板校验 → svgo → gzip 计量 → 渲染 → 走查拼贴单
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';
import { optimize } from 'svgo';

// 项目美术子色板（声明式）：暖中性 17 + 深黑/on-coal-dim（结局暗幕需要）
const ART_WARM = [
  '#17150f', '#26231c', '#38342a', '#55503f', '#8d8368', '#d8d0ba',
  '#b6ab94', '#d5c9ab', '#f7f2e2', '#22201a', '#262420', '#e4decb',
  '#a43a2f', '#c0503f', '#e48034', '#b44622', '#7c2a20',
  '#0d0c09', '#b3ac97',
];
const MANIFEST = {
  'ending-a-cold-ash.svg': ART_WARM,
  'ending-b-signal-lost.svg': ART_WARM,
  'ending-c-stable-run.svg': [...ART_WARM, '#2c625a'], // C 专属：fidelity 绿语义锚
  'ending-d-peak-efficiency.svg': ART_WARM,
  'ending-e-unplugged.svg': ART_WARM,
  'paper-to-furnace.svg': ART_WARM, // 首个 PoC 样张（拷贝入库）
};

const dir = 'llm-svg-batch/candidates';
const report = {};
const cells = [];

for (const [name, palette] of Object.entries(MANIFEST)) {
  const raw = readFileSync(`${dir}/${name}`, 'utf8');
  const svg = optimize(raw, { multipass: true }).data;
  writeFileSync(`llm-svg-batch/out/${name}`, svg);
  const fills = [...new Set(svg.match(/(?<=fill=")#[0-9a-f]{6}/g) ?? [])];
  const strokes = [...new Set(svg.match(/(?<=stroke=")#[0-9a-f]{6}/g) ?? [])];
  const off = [...fills, ...strokes].filter((c) => !palette.includes(c));
  const png = await sharp(Buffer.from(svg)).resize({ width: 460 }).png().toBuffer();
  writeFileSync(`llm-svg-batch/out/${name.replace('.svg', '.png')}`, png);
  report[name] = {
    rawBytes: Buffer.byteLength(raw),
    gzipBytes: gzipSync(svg).length,
    elements: (svg.match(/<(path|rect|line|circle)/g) ?? []).length,
    colors: fills.length + strokes.length,
    offPalette: off,
    verdict: off.length === 0 ? 'PASS' : 'FAIL',
  };
  cells.push({ name, png });
}

writeFileSync('llm-svg-batch/out/batch-report.json', JSON.stringify(report, null, 2));
console.table(Object.entries(report).map(([k, v]) => ({ file: k, ...v })));

// 走查拼贴单：2 列 × 4 行，带标签
const CW = 460, CH = 300, GUT = 24, LABEL = 26;
const cols = 2, rows = Math.ceil(cells.length / cols);
const W = cols * CW + (cols + 1) * GUT, H = rows * (CH + LABEL) + (rows + 1) * GUT;
const composites = [];
cells.forEach((c, i) => {
  const x = GUT + (i % cols) * (CW + GUT);
  const y = GUT + Math.floor(i / cols) * (CH + LABEL + GUT);
  const label = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${LABEL}"><text x="2" y="18" font-family="Consolas, monospace" font-size="15" fill="#b3ac97">${c.name.replace('.svg', '')}</text></svg>`
  );
  composites.push({ input: c.png, left: x, top: y + LABEL });
  composites.push({ input: label, left: x, top: y });
});
await sharp({
  create: { width: W, height: H, channels: 3, background: { r: 13, g: 12, b: 9 } },
})
  .composite(composites)
  .png()
  .toFile('llm-svg-batch/out/contact-sheet.png');
console.log(`contact sheet: llm-svg-batch/out/contact-sheet.png (${W}x${H})`);
