// AI 插画资产管线 PoC（research/，不入生产 verify）
// 输入：任意光栅（PoC 用公有领域版画代替 ComfyUI 生成输出——生成槽位可替换）
// 输出：项目色板收编的紧凑 SVG + 量化报告
// 用法：node pipeline.mjs <input> [outputBase]
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { convertBuffer } from '@visioncortex/vtracer';
import { optimize } from 'svgo';

const [, , inputArg = 'input/dore-canto-xv.jpg', outBase = 'output/poc'] = process.argv;
const input = readFileSync(inputArg);

// 项目色板（tokens.css 浅色值 + 余烬族）——任何生成图被 OKLab 最近色强制收编
const PALETTE = [
  '#17150f', '#26231c', '#38342a', '#55503f', '#8d8368', '#d8d0ba', // n0–n5
  '#b6ab94', '#d5c9ab', '#f7f2e2', '#22201a', '#262420', '#e4decb', // desk/machine/paper/ink/coal/on-coal
  '#a43a2f', '#e48034', '#b44622', '#d4a72c', '#2c625a',            // heat/ember/ember-deep/warning/fidelity
];

const variants = {
  // 主变体：色板收编 + poster + spline + 去斑点 + 曲线简化
  palette: {
    preset: 'poster',
    mode: 'spline',
    palette: PALETTE,
    filterSpeckle: 12,
    simplify: 1.5,
    optimize: 2,
    pathPrecision: 4,
  },
  // 对照变体：不锁色板（观察自由色数量与体积差异）
  free: {
    preset: 'poster',
    mode: 'spline',
    filterSpeckle: 12,
    simplify: 1.5,
    optimize: 2,
    pathPrecision: 4,
    maxColors: 12,
  },
};

const fills = (svg) => [...new Set(svg.match(/fill="[^"]+"/g) ?? [])];
const report = { input: inputArg, inputBytes: input.length, variants: {} };

for (const [name, opts] of Object.entries(variants)) {
  const raw = convertBuffer(input, opts);
  const opt = optimize(raw, { multipass: true });
  const svg = opt.data;
  writeFileSync(`${outBase}-${name}.svg`, svg);
  report.variants[name] = {
    rawSvgBytes: Buffer.byteLength(raw),
    optimizedSvgBytes: Buffer.byteLength(svg),
    gzipBytes: 0,
    paths: (svg.match(/<path/g) ?? []).length,
    distinctFills: fills(svg),
  };
  report.variants[name].gzipBytes = gzipSync(svg).length;
}

const p = report.variants.palette;
const offPalette = p.distinctFills.filter((f) => !PALETTE.includes(f.slice(6, -1).toLowerCase()));
report.paletteCompliance = {
  allowed: PALETTE.length,
  used: p.distinctFills.length,
  offPalette,
};
writeFileSync(`${outBase}-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
