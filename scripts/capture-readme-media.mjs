// PRESENTATION_SPEC §18–§23：README 媒体采集（真实 Playwright 流程，不使用状态强制参数）。
// 产物：boot-zh.png / boot-en.png / machine-zh.png / machine-en.png
//       settings-zh.png / settings-en.png / result-zh.png / result-en.png（v1.2 §15）
//       gameplay.gif（en UI）/ gameplay-zh.gif（zh UI）
//       switch-en.gif（en 起）/ switch-zh.gif（zh 起）（v1.2 §13-2）
//       social-preview.png
// 仅 `npm run capture:readme` 使用；ffmpeg 来自 devDependency ffmpeg-static（D39）。
import { chromium } from '@playwright/test';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static');
const BASE = process.env.CAPTURE_BASE_URL ?? 'http://localhost:4173';
const OUT = join(process.cwd(), 'docs', 'media');
const CHANNEL = process.env.CHROMIUM_CHANNEL;

mkdirSync(join(OUT, 'readme'), { recursive: true });

const browser = await chromium.launch(CHANNEL ? { channel: CHANNEL } : {});

async function withLocale(locale, bootShot, fn) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale,
  });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForTimeout(400);
  if (bootShot) {
    // README 头图：上电前的标题卡界面（与各自语言的 GIF 一一对应）
    await page.locator('main.machine').screenshot({ path: join(OUT, 'readme', bootShot) });
  }
  await page.getByTestId('power-on').click();
  await page.waitForTimeout(1500);
  await page.getByTestId('ignite').click(); // 完成教学（D35）
  await page.waitForTimeout(300);
  await fn(page);
  await context.close();
}

async function playRound(page, { gain = 0, leftMoves = 0, rightMoves = 0 } = {}) {
  const left = page.locator('[data-cutter="left"]');
  await left.focus();
  for (let i = 0; i < leftMoves; i++) await page.keyboard.press('ArrowRight');
  const right = page.locator('[data-cutter="right"]');
  await right.focus();
  for (let i = 0; i < rightMoves; i++) await page.keyboard.press('ArrowLeft');
  if (gain > 0) await page.locator(`.gain-stop[data-value="${gain}"]`).click();
  await page.getByTestId('ignite').click();
  await page.waitForTimeout(1200);
}

async function next(page) {
  await page.getByTestId('next').click();
  await page.waitForTimeout(300);
}

// §15：machine-zh.png（zh / C04 / gain 0）与 machine-en.png（en / C08 / gain 2）；boot 头图随行采集。
// v1.2 §15：settings-*（C04 / GAIN 0，面板开启，按 machine 边界裁剪以同比例）与
//           result-*（C06 / GAIN 1，ROUND_RESULT：机器消息 + 下一份按钮）。
// 设置弹层挂在 body 上而非 main.machine 内，故取 machine boundingBox 作 clip；
// 编辑态机身天然矮于结果态（738 vs 803），上下对称补边统一为 1088×803 画幅（§15 v1.2.1），
// 使 Screenshots 网格四图等高、行底边对齐。
const GRID_CANVAS_H = 803;
async function captureSettings(page, outName) {
  await page.getByTestId('settings-btn').click();
  await page.waitForTimeout(350); // 弹层 fade-in 200ms + 余量
  const box = await page.locator('main.machine').boundingBox();
  if (!box) throw new Error('machine element not found for settings capture');
  const vh = page.viewportSize()?.height ?? 900;
  const pad = Math.max(0, GRID_CANVAS_H - box.height);
  const clipH = Math.min(GRID_CANVAS_H, vh - box.y);
  const clipY = Math.max(0, Math.min(box.y - pad / 2, vh - clipH));
  await page.screenshot({ path: join(OUT, 'readme', outName), clip: { x: box.x, y: clipY, width: box.width, height: clipH } });
  await page.keyboard.press('Escape'); // D3 关闭
  await page.waitForTimeout(250);
}

await withLocale('zh-CN', 'boot-zh.png', async (page) => {
  for (let c = 1; c <= 3; c++) {
    await playRound(page, { gain: 0 });
    if (c < 3) await next(page);
  }
  await page.waitForTimeout(400);
  await page.locator('main.machine').screenshot({ path: join(OUT, 'readme', 'machine-zh.png') });
  await next(page); // ROUND_RESULT → C04 编辑态（IGNITE 仅在编辑态可用）
  await captureSettings(page, 'settings-zh.png');
  await playRound(page, { gain: 0 }); // C04
  await next(page);
  await playRound(page, { gain: 1 }); // C05（GAIN 1 解锁）
  await next(page);
  await playRound(page, { gain: 1 }); // C06
  await page.waitForTimeout(1400); // playRound 已等 1200ms；合计 ≈2.6s，反馈动画 + ROUND_RESULT 就绪
  await page.locator('main.machine').screenshot({ path: join(OUT, 'readme', 'result-zh.png') });
});

await withLocale('en-US', 'boot-en.png', async (page) => {
  for (let c = 1; c <= 3; c++) {
    await playRound(page, { gain: 0, leftMoves: 1 });
    await next(page);
  }
  await captureSettings(page, 'settings-en.png'); // C04 编辑态
  for (let c = 4; c <= 5; c++) {
    await playRound(page, { gain: c <= 4 ? 0 : 1, leftMoves: 1 });
    await next(page);
  }
  await playRound(page, { gain: 1, leftMoves: 1 }); // C06
  await page.waitForTimeout(1400);
  await page.locator('main.machine').screenshot({ path: join(OUT, 'readme', 'result-en.png') });
  await next(page);
  await playRound(page, { gain: 2, leftMoves: 1 }); // C07（与 v1.1 落点一致：此后不再 next）
  await page.waitForTimeout(400);
  await page.locator('main.machine').screenshot({ path: join(OUT, 'readme', 'machine-en.png') });
});

// §13–14：GIF 按语言各一份（en → gameplay.gif；zh → gameplay-zh.gif），分镜相同，
// Cycle 06 起，≤7.5s，960×600，12fps
// ffmpeg：裁尾部片段 → 全视口等比 960×600 → 12fps → palette GIF。
// 注意必须用**输出端精确 seek**（-ss 在 -i 之后）：Playwright webm 容器时长含 ~1s 尾部填充，
// 输入端 -sseof 快速 seek 会打乱帧时间戳（实测两次相隔 2.2s 的点击被压成 0.4s）。
// tail 比 take 多留 1s 前置余量，保证分镜首个动作不被容器填充偏移裁掉。
function videoDuration(file) {
  const res = spawnSync(ffmpegPath, ['-i', file], { encoding: 'utf8' });
  const m = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(String(res.stderr));
  if (!m) throw new Error(`cannot read duration of ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function encodeTailGif(videoPath, tailSeconds, takeSeconds, outName) {
  const dur = videoDuration(videoPath);
  const start = Math.max(0, dur - tailSeconds);
  const trimmed = join(OUT, 'readme', 'playwright-video.webm');
  const palette = join(OUT, 'readme', 'palette.png');
  const gif = join(OUT, 'readme', outName);
  const gifScale = 'crop=1440:900:0:0,scale=960:600:flags=lanczos,fps=12';
  execFileSync(ffmpegPath, [
    '-y', '-i', videoPath, '-ss', start.toFixed(3), '-t', String(takeSeconds),
    '-c:v', 'libvpx', '-b:v', '600k', '-an', trimmed,
  ]);
  execFileSync(ffmpegPath, [
    '-y', '-i', trimmed, '-vf',
    `${gifScale},split[a][b];[a]palettegen=max_colors=80[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
    gif,
  ]);
}

async function captureGif(locale, outName) {
  const gifContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale,
    recordVideo: { dir: join(OUT, 'readme'), size: { width: 1440, height: 900 } },
  });
  const gifPage = await gifContext.newPage();
  await gifPage.goto(BASE);
  await gifPage.getByTestId('power-on').click();
  await gifPage.waitForTimeout(1500);
  await gifPage.getByTestId('ignite').click();
  await gifPage.waitForTimeout(300);
  // 走到 Cycle 06 编辑态（5 轮全部 next；C05 起 gain 1 可用）
  for (let c = 1; c <= 5; c++) {
    await playRound(gifPage, { gain: c <= 4 ? 0 : 1, leftMoves: 1 });
    await next(gifPage);
  }
  // §13 分镜：裁刀 → OUTPUT → GAIN 0→1 → IGNITE → 反馈
  await gifPage.locator('[data-cutter="left"]').focus();
  await gifPage.keyboard.press('ArrowRight');
  await gifPage.waitForTimeout(700);
  await gifPage.locator('[data-cutter="right"]').focus();
  await gifPage.keyboard.press('ArrowLeft');
  await gifPage.waitForTimeout(700);
  await gifPage.locator('.gain-stop[data-value="1"]').click();
  await gifPage.waitForTimeout(800);
  // 机身实测边界仅作存在性校验；GIF 裁全视口（1440×900 → 960×600 恰为 1.6:1 等比），
  // 燃烧态布局增高也不会裁切
  const machineBox = await gifPage.locator('main.machine').boundingBox();
  await gifPage.getByTestId('ignite').click();
  await gifPage.waitForTimeout(2600);
  const videoPath = await gifPage.video()?.path();
  await gifContext.close();
  if (!machineBox) throw new Error('machine element not found for GIF capture');

  encodeTailGif(videoPath, 8.5, 7.5, outName);
}

await captureGif('en-US', 'gameplay.gif');
await captureGif('zh-CN', 'gameplay-zh.gif');

// §13-2（v1.2）：语言切换 GIF（switch-en 从英文 UI 起、switch-zh 从中文 UI 起），Cycle 03，≤5.5s
async function captureSwitchGif(startLocale, outName) {
  const switchContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: startLocale,
    recordVideo: { dir: join(OUT, 'readme'), size: { width: 1440, height: 900 } },
  });
  const switchPage = await switchContext.newPage();
  await switchPage.goto(BASE);
  await switchPage.getByTestId('power-on').click();
  await switchPage.waitForTimeout(1500);
  await switchPage.getByTestId('ignite').click();
  await switchPage.waitForTimeout(300);
  // 走到 Cycle 03 编辑态（GAIN 未解锁，界面最安静）
  for (let c = 1; c <= 2; c++) {
    await playRound(switchPage, { gain: 0 });
    await next(switchPage);
  }
  // §13-2 分镜：静止 → 切换 → 停留 → 切回 → 静止收尾（视频尾部 5.5s 即成品，1s 前置余量）
  await switchPage.waitForTimeout(1000);
  await switchPage.getByTestId('locale-toggle').click();
  await switchPage.waitForTimeout(2200);
  await switchPage.getByTestId('locale-toggle').click();
  await switchPage.waitForTimeout(2500);
  const videoPath = await switchPage.video()?.path();
  await switchContext.close();

  encodeTailGif(videoPath, 6.5, 5.5, outName);
}

await captureSwitchGif('en-US', 'switch-en.gif');
await captureSwitchGif('zh-CN', 'switch-zh.gif');

// §22–23：social-preview.png（1280×640，仅用既有视觉资产；纯色底消除拼缝）
const spContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
const spPage = await spContext.newPage();
await spPage.goto(BASE);
await spPage.waitForTimeout(400);
await spPage.addStyleTag({ content: 'body{background:#0E0F0C !important}' });
await spPage.waitForTimeout(120);
await spPage.locator('main.machine').screenshot({ path: join(OUT, 'sp-raw.png') });
await spContext.close();
execFileSync(ffmpegPath, [
  '-y', '-i', join(OUT, 'sp-raw.png'),
  '-vf', "scale=w=816:h=520:force_original_aspect_ratio=decrease,pad=1280:640:(ow-iw)/2:(oh-ih)/2:color=0x0E0F0C",
  join(OUT, 'social-preview.png'),
]);

await browser.close();
// 清理中间产物（保留全部最终资产；playwright-video.webm 已 gitignore）
const { rmSync, existsSync } = await import('node:fs');
for (const f of [join(OUT, 'sp-raw.png'), join(OUT, 'readme', 'palette.png')]) {
  if (existsSync(f)) rmSync(f);
}
for (const f of (await import('node:fs')).readdirSync(join(OUT, 'readme'))) {
  if (f.startsWith('page@') && f.endsWith('.webm')) rmSync(join(OUT, 'readme', f));
}
console.log('capture:readme done →', OUT);
