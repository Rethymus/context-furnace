// UI_CONTRACT §4.9：材质量化探针（开发工具，D43 类；非正式 e2e，不进生产 bundle）。
// 度量（两外观各跑一次，写 shots/matmetrics/）：
//   glassVisibility   = backdrop-filter 开/关两张截图在面板区域的逐像素平均绝对差
//                       （毛玻璃可见度的直接度量；0 = 模糊完全不可见）
//   glassVisibilityGlass = 同上，玻璃条（status-line）区域
//   backgroundMottle  = 面板顶部无文字条带的亮度标准差（斑驳透过玻璃的可见度）
//   separationFeed    = 面板填充亮度 − 台面亮度（避开光场的左上采样条）
// 运行：npm run build && npm run preview & 后 node scripts/probe-matmetrics.mjs [light|dark]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const scheme = process.argv[2] === 'dark' ? 'dark' : 'light';
const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4173';
const OUT = 'shots/matmetrics';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(
  process.env.CHROMIUM_CHANNEL ? { channel: process.env.CHROMIUM_CHANNEL } : {},
);
const context = await browser.newContext({
  colorScheme: scheme,
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
await page.goto(BASE);
await page.waitForTimeout(500);

// 到 Cycle 01 编辑视图（跳过教学即达；面板 + 仪表 + 轨道齐备）
await page.getByTestId('power-on').click();
await page.waitForTimeout(1500);
await page.getByTestId('ignite').click(); // 跳过教学 → Cycle 01
await page.waitForTimeout(600);

const boxes = await page.evaluate(() => {
  const feed = document.querySelector('.panel-feed').getBoundingClientRect();
  const glass = document.querySelector('.status-line').getBoundingClientRect();
  const stage = document.querySelector('.stage').getBoundingClientRect();
  return {
    // 面板主体（含文字，用于 blur 开关像素差——内容恒定，差值只来自模糊）
    feed: { x: feed.x + 8, y: feed.y + 8, w: feed.width - 16, h: feed.height - 16 },
    // 面板顶部无文字条带（面板 padding 顶部 12px；标签从 y+12 起）→ 测背景斑驳
    feedEdge: { x: feed.x + 8, y: feed.y + 2, w: feed.width - 16, h: 8 },
    glass: { x: glass.x + 12, y: glass.y + 4, w: glass.width - 24, h: glass.height - 8 },
    // 台面采样条：左上角（避开底部暖光 50%/88% 与右上冷光 84%/6%）
    bench: { x: stage.x + 8, y: stage.y + 40, w: 16, h: 120 },
    dpr: window.devicePixelRatio,
  };
});

async function grabPixels() {
  const buf = await page.screenshot({ type: 'png' });
  const b64 = buf.toString('base64');
  return page.evaluate(
    async ({ b64, boxes }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dpr = boxes.dpr || 1;
      function px(box) {
        const d = ctx.getImageData(
          Math.round(box.x * dpr),
          Math.round(box.y * dpr),
          Math.max(1, Math.round(box.w * dpr)),
          Math.max(1, Math.round(box.h * dpr)),
        ).data;
        const l = new Float32Array(d.length / 4);
        for (let i = 0, j = 0; i < d.length; i += 4, j++) {
          l[j] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        }
        return l;
      }
      function stats(l) {
        let sum = 0,
          sum2 = 0;
        for (const v of l) {
          sum += v;
          sum2 += v * v;
        }
        const mean = sum / l.length;
        return { mean, std: Math.sqrt(Math.max(0, sum2 / l.length - mean * mean)) };
      }
      return {
        feed: px(boxes.feed),
        feedStats: stats(px(boxes.feed)),
        feedEdgeStats: stats(px(boxes.feedEdge)),
        glassStats: stats(px(boxes.glass)),
        benchStats: stats(px(boxes.bench)),
      };
    },
    { b64, boxes },
  );
}

function mad(a, b) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]);
  return s / n;
}

const withF = await grabPixels();
await page.addStyleTag({ content: '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' });
await page.waitForTimeout(150);
const withoutF = await grabPixels();

const result = {
  scheme,
  metrics: {
    glassVisibility: Number(mad(withF.feed, withoutF.feed).toFixed(2)),
    glassVisibilityGlass: Number(
      (
        (Math.abs(withF.glassStats.mean - withoutF.glassStats.mean) +
          Math.abs(withF.glassStats.std - withoutF.glassStats.std)) /
        2
      ).toFixed(2),
    ),
    backgroundMottle: Number(withF.feedEdgeStats.std.toFixed(2)),
    benchMottle: Number(withF.benchStats.std.toFixed(2)),
    separationFeed: Number(Math.abs(withF.feedStats.mean - withF.benchStats.mean).toFixed(2)),
    separationGlass: Number(Math.abs(withF.glassStats.mean - withF.benchStats.mean).toFixed(2)),
  },
};
writeFileSync(`${OUT}/matmetrics-${scheme}.json`, JSON.stringify(result, null, 2));
console.log(`[${scheme}]`, JSON.stringify(result.metrics));
await context.close();
await browser.close();
