// 一次性集成补丁：把优化后的五幅结局版画注入 src/ui/machine.ts（v4.9 M6）
import { readFileSync, writeFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const out = {};
for (const e of ['a-cold-ash', 'b-signal-lost', 'c-stable-run', 'd-peak-efficiency', 'e-unplugged']) {
  const svg = read(`research/ai-pipeline/llm-svg-batch/out/ending-${e}.svg`).trim();
  if (svg.includes("'")) throw new Error(`single quote in ${e}`);
  out[e[0]] = svg;
}
const entries = Object.entries(out).map(([k, v]) => `  '${k}': '${v}',`).join('\n');
const block = [
  '// v4.9 M6 结局版画（2026-09-09 所有者授权「LLM 直写 SVG」+「授权执行」）：',
  '// 五结局木刻版画，模型直写 SVG 经子色板闸门（research/ai-pipeline/llm-svg-batch）',
  '// 后入库的优化件。纯视觉层：零文本、零时间线（RM 天然合规）、显式填充色',
  '// （不依赖透明度效果，RT 保持）——与仪表 SVG 同层的 inline 内容件。',
  "const ENDING_WOODCUTS: Record<'a' | 'b' | 'c' | 'd' | 'e', string> = {",
  entries,
  '};',
  '',
].join('\n');

let mts = read('src/ui/machine.ts');
const anchor1 = '// §2.2 开机动画 1.15s';
if (!mts.includes(anchor1)) throw new Error('anchor1 missing');
mts = mts.replace(anchor1, block + '\n' + anchor1);
const anchor2 = '    // §13 E：所有仪表 → 0、火焰熄灭（在收尾画面上体现）';
if (!mts.includes(anchor2)) throw new Error('anchor2 missing');
mts = mts.replace(
  anchor2,
  [
    '    // v4.9 M6：结局版画板挂载于结算玻璃幕顶部、横幅之上（aria-hidden 纯视觉）',
    "    const plate = document.createElement('div');",
    "    plate.className = 'ending-plate';",
    "    plate.setAttribute('aria-hidden', 'true');",
    '    plate.innerHTML = ENDING_WOODCUTS[ending.toLowerCase()];',
    '    endWrap.appendChild(plate);',
    '',
    anchor2,
  ].join('\n')
);
writeFileSync('src/ui/machine.ts', mts);
console.log('patched machine.ts:', mts.length, 'bytes');
