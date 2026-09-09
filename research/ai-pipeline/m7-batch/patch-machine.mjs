// M7 集成补丁：向 src/ui/machine.ts 注入常量与挂载点（幂等：检测标记跳过）
// machine.ts 为 CRLF 行尾：所有多行锚点与插入块统一经 L() 适配
import { readFileSync, writeFileSync } from 'node:fs';

const L = (s) => s.replace(/\n/g, '\r\n');
const ROOT = '../../';
const read = (p) => readFileSync(ROOT + p, 'utf8');
const svg = (name) => read(`research/ai-pipeline/m7-batch/out/${name}.svg`).trim();

const cardFiles = [
  'card-c01-coffee-memory', 'card-c02-evening-study', 'card-c03-upgrade-files',
  'card-c04-bonus-calendar', 'card-c05-night-noise', 'card-c06-material-price',
  'card-c07-harder-test', 'card-c08-alarm-log', 'card-c09-two-groups',
  'card-c10-complaint-decay', 'card-c11-east-parking', 'card-c12-hot-cold-slots',
];
const sealComments = [
  'C01 咖啡记忆', 'C02 晚自习', 'C03 升级插件', 'C04 奖金日历', 'C05 深夜噪声',
  'C06 原料涨价', 'C07 难度分降', 'C08 高温报警', 'C09 两组误差',
  'C10 投诉回落', 'C11 东区车位', 'C12 冷热双槽',
];
const seals = cardFiles
  .map((f, i) => `  // ${sealComments[i]}\n  '${svg(f)}',`)
  .join('\n');

let src = read('src/ui/machine.ts');
if (src.includes('CARD_SEALS')) {
  console.log('already patched — skip');
  process.exit(0);
}

const must = (label, anchor) => {
  if (!src.includes(anchor)) throw new Error(`${label} anchor missing`);
  return anchor;
};

// ① 常量块：插在 M6 woodcuts 之后、boot 时序常量之前
const CONST_BLOCK = L(`
// v5.0 M7 插画常量（2026-09-09 所有者批复 K1–K5；候选库 m7-batch 闸门 PASS 后入库）。
// 全部 LLM 直写 SVG：零文本节点、色板 ⊆ 美术子色板（C12 teal 语义锚）、mw-* 动画类由 motion.css 驱动
const HOME_STANDBY = '${svg('home-standby')}';

const FURNACE_INTERIOR = '${svg('furnace-interior')}';

// 每周期一张卡（C01→C12 固定顺序），印章按 cycle 取用
const CARD_SEALS: readonly string[] = [
${seals}
];
`);
const ANCHOR_CONST = "// §2.2 开机动画 1.15s；§8.3 反馈动画 950ms（时序集中管理）";
must('const', ANCHOR_CONST);
src = src.replace(ANCHOR_CONST, CONST_BLOCK + '\r\n' + ANCHOR_CONST);

// ② home 待机版画挂载
const ANCHOR_HOME = '    homeBody.appendChild(bootLine);';
must('home', ANCHOR_HOME);
src = src.replace(
  ANCHOR_HOME,
  ANCHOR_HOME +
    L(`

    // v5.0 M7 H1 待机版画（aria-hidden 纯视觉；冷炉语义，与结局版画同族）
    const homePlate = document.createElement('div');
    homePlate.className = 'home-plate';
    homePlate.setAttribute('aria-hidden', 'true');
    homePlate.innerHTML = HOME_STANDBY;
    homeBody.appendChild(homePlate);`),
);

// ③ H2 点亮钩子（470ms 纸卡脉冲同拍）
const ANCHOR_BOOT = L(`    window.setTimeout(() => {
      const card = root.querySelector<HTMLElement>('main.machine');
      if (card) card.classList.add('boot-pulse');
    }, BOOT_SWEEP_DONE_MS);`);
must('boot', ANCHOR_BOOT);
src = src.replace(
  ANCHOR_BOOT,
  L(`    window.setTimeout(() => {
      const card = root.querySelector<HTMLElement>('main.machine');
      if (card) card.classList.add('boot-pulse');
      // v5.0 M7 H2：待机版画随开机点亮（RM/freeze 下无过渡、即时态）
      root.querySelector<HTMLElement>('.home-plate')?.classList.add('plate-lit');
    }, BOOT_SWEEP_DONE_MS);`),
);

// ④ 炉膛内景：观察窗火焰层之下
const ANCHOR_OBS = '    darkPanel.appendChild(observation.root);';
must('observation', ANCHOR_OBS);
src = src.replace(
  ANCHOR_OBS,
  ANCHOR_OBS +
    L(`

    // v5.0 M7 G1 炉膛内景（观察窗静态深度背景，火焰层之下，aria-hidden）
    const interior = document.createElement('div');
    interior.className = 'furnace-interior';
    interior.setAttribute('aria-motion', '');
    interior.setAttribute('aria-hidden', 'true');
    interior.innerHTML = FURNACE_INTERIOR;
    observation.root.prepend(interior);`),
);

// ⑤ 卡面印章挂载（FEED 纸卡，落款角章位）
const ANCHOR_FEED = L(`    feedPanel.body.appendChild(feedText);
    colMain.appendChild(feedPanel.wrap);`);
must('feed', ANCHOR_FEED);
src = src.replace(
  ANCHOR_FEED,
  L(`    feedPanel.body.appendChild(feedText);

    // v5.0 M7 G3 卡面印章（落款角章，aria-hidden；每周期随卡切换 innerHTML）
    const cardSeal = document.createElement('div');
    cardSeal.className = 'card-seal';
    cardSeal.setAttribute('aria-hidden', 'true');
    feedPanel.wrap.appendChild(cardSeal);
    colMain.appendChild(feedPanel.wrap);`),
);

// ⑥ 印章随周期切换 + feed 正文入场（renderCycleTexts 内）
const ANCHOR_ACT = "    round.machineEl.dataset.act = String(this.state.act);";
must('act', ANCHOR_ACT);
src = src.replace(
  ANCHOR_ACT,
  ANCHOR_ACT +
    L(`

    // v5.0 M7 G3/G4：印章随卡切换（新 <svg> 入场自动重放 mw-enter）；feed 正文一次性入场
    const sealEl = round.machineEl.querySelector<HTMLElement>('.card-seal');
    if (sealEl) sealEl.innerHTML = CARD_SEALS[this.state.cycle - 1] ?? '';
    round.feedText.classList.remove('feed-enter');
    void round.feedText.offsetWidth; // 一次性 class 重挂以重放入场动画
    round.feedText.classList.add('feed-enter');`),
);

writeFileSync(ROOT + 'src/ui/machine.ts', src);
console.log('patched: consts + home plate + H2 hook + interior + seal mount + cycle swap');
