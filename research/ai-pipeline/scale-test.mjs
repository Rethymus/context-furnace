// 尺寸/体积曲线实验：同一版画在 不同输入尺寸/裁切 下的矢量化产出
// 模拟两类真实资产：A) 整幅插画（缩到游戏可用宽度）B) 局部小插画（纸带配图级）
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';
import { convertBuffer } from '@visioncortex/vtracer';
import { optimize } from 'svgo';

const PALETTE = [
  '#17150f', '#26231c', '#38342a', '#55503f', '#8d8368', '#d8d0ba',
  '#b6ab94', '#d5c9ab', '#f7f2e2', '#22201a', '#262420', '#e4decb',
  '#a43a2f', '#e48034', '#b44622', '#d4a72c', '#2c625a',
];
const OPTS = {
  preset: 'poster',
  mode: 'spline',
  palette: PALETTE,
  filterSpeckle: 12,
  simplify: 1.5,
  optimize: 2,
  pathPrecision: 4,
};

const src = sharp('input/dore-canto-xv.jpg');
const meta = await src.metadata();

// A) 整幅，缩到若干宽度
const widths = [760, 480, 320, 200];
// B) 局部小插画：中央人物区裁切 ~35% 后缩到 200px 宽
const cases = [];
for (const w of widths) {
  cases.push({ name: `full-${w}w`, pipeline: sharp('input/dore-canto-xv.jpg').resize({ width: w }) });
}
const cw = Math.round(meta.width * 0.35), ch = Math.round(meta.height * 0.35);
const left = Math.round((meta.width - cw) / 2), top = Math.round((meta.height - ch) / 2);
cases.push({ name: 'spot-200w', pipeline: sharp('input/dore-canto-xv.jpg').extract({ left, top, width: cw, height: ch }).resize({ width: 200 }) });
cases.push({ name: 'spot-120w', pipeline: sharp('input/dore-canto-xv.jpg').extract({ left, top, width: cw, height: ch }).resize({ width: 120 }) });

const results = [];
for (const c of cases) {
  const png = await c.pipeline.png().toBuffer();
  writeFileSync(`output/${c.name}.png`, png);
  const raw = convertBuffer(png, OPTS);
  const svg = optimize(raw, { multipass: true }).data;
  writeFileSync(`output/${c.name}.svg`, svg);
  const pngRender = await sharp(Buffer.from(svg)).resize({ width: 760 }).png().toBuffer();
  writeFileSync(`output/${c.name}-render.png`, pngRender);
  results.push({
    case: c.name,
    pngBytes: png.length,
    svgBytes: Buffer.byteLength(svg),
    gzipBytes: gzipSync(svg).length,
    paths: (svg.match(/<path/g) ?? []).length,
    fills: [...new Set(svg.match(/(?<=fill=")#[0-9a-f]{6}/g) ?? [])],
  });
}
writeFileSync('output/scale-report.json', JSON.stringify({ results }, null, 2));
console.table(results.map(({ fills, ...r }) => ({ ...r, fills: fills.length })));
