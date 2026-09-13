// M8 集成补丁：向 src/ui/machine.ts 注入 TUTORIAL_FIGURES 常量、便签内挂载与步进换图
// （幂等：检测标记跳过；machine.ts 为 CRLF，锚点经 L() 适配）
import { readFileSync, writeFileSync } from 'node:fs';

const L = (s) => s.replace(/\n/g, '\r\n');
const ROOT = '../../';
const read = (p) => readFileSync(ROOT + p, 'utf8');
const svg = (name) => read(`research/ai-pipeline/m8-batch/out/${name}.svg`).trim();

const FIG_NAMES = ['step-1-left-cutter', 'step-2-right-cutter', 'step-3-output', 'step-4-ignite'];
const FIG_COMMENTS = ['Step1 左刀右移', 'Step2 右刀左移', 'Step3 OUTPUT 跟随', 'Step4 IGNITE 入炉'];
const figures = FIG_NAMES.map((f, i) => `  // ${FIG_COMMENTS[i]}\n  '${svg(f)}',`).join('\n');

let src = read('src/ui/machine.ts');
if (src.includes('TUTORIAL_FIGURES')) {
  console.log('already patched — skip');
  process.exit(0);
}
const must = (label, anchor) => {
  if (!src.includes(anchor)) throw new Error(`${label} anchor missing`);
  return anchor;
};

// ① 常量（置于 §2.2 时序注释之前）
const CONST_BLOCK = L(`
// v5.1 M8 教学手册图解（2026-09-13 所有者「请继续迭代」续批；LLM 直写 SVG，
// 闸门 m8-batch 4/4 PASS；零文本、色板 ⊆ 墨线子色板；随 §3 步进切换）
const TUTORIAL_FIGURES: readonly string[] = [
${figures}
];
`);
const ANCHOR_CONST = "// §2.2 开机动画 1.15s；§8.3 反馈动画 950ms（时序集中管理）";
must('const', ANCHOR_CONST);
src = src.replace(ANCHOR_CONST, CONST_BLOCK + '\r\n' + ANCHOR_CONST);

// ② 挂载：便签内、步进点之前（手册风：图解 | 步进点 | 提示文字）
const ANCHOR_APPEND = '    hint.append(dots, hintText);';
must('mount', ANCHOR_APPEND);
src = src.replace(
  ANCHOR_APPEND,
  L(`    // v5.1 M8 手册图解（aria-hidden 纯视觉；随步进切换 innerHTML）
    const tutorialFigure = document.createElement('span');
    tutorialFigure.className = 'tutorial-figure';
    tutorialFigure.setAttribute('aria-hidden', 'true');
    hint.append(tutorialFigure, dots, hintText);`),
);

// ③ 步进换图（showTutorialStep 内；新 <svg> 自带一次性入场）
const ANCHOR_STEP = "    if (note) note.textContent = hints[this.tutorialStep] ?? '';";
must('step', ANCHOR_STEP);
src = src.replace(
  ANCHOR_STEP,
  ANCHOR_STEP +
    L(`\n    const fig = els.hint.querySelector<HTMLElement>('.tutorial-figure');
    if (fig) fig.innerHTML = TUTORIAL_FIGURES[this.tutorialStep] ?? '';`),
);

writeFileSync(ROOT + 'src/ui/machine.ts', src);
console.log('patched: TUTORIAL_FIGURES + note mount + step swap');
