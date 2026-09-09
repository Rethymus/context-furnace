// M3 性能与降级审计（UI_CONTRACT v4.5）— 测试基建，不入 verify；不修改 src/。
// 用法：node scripts/audit-perf.mjs
//   自动确保 dist 存在（缺失时 npm run build）→ 启动 vite preview --port 4188（固定端口）
//   → 五项量化采集 → 杀掉 preview（Windows netstat+taskkill）→ 输出 shots/audit/m3-data.json。
// 五项：① backdrop-filter 表面普查 ② 合成器友好度（静态解析 styles/*.css）
//      ③ backdrop-root 陷阱（运行时祖先链 + 入场动画瞬时截断）④ 降级矩阵实测（CDP setEmulatedMedia）
//      ⑤ 帧健康度代理（IGNITE 期间 rAF 采样 2s）。
import { chromium } from '@playwright/test';
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PORT = 4188; // M3 约定端口（区别于 e2e 的 4173）
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = join(ROOT, 'shots', 'audit');
const DATA_PATH = join(OUT_DIR, 'm3-data.json');
mkdirSync(OUT_DIR, { recursive: true });

// ── 工具 ────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 仅取 LISTENING 且本地地址为 :port 的行，避免误杀客户端（ESTABLISHED 对端）PID
function listeningPids(port) {
  try {
    const out = execSync('netstat -ano -p tcp', { shell: 'cmd.exe' }).toString();
    const pids = new Set();
    for (const line of out.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (
        parts.length >= 5 &&
        parts[0] === 'TCP' &&
        parts[1].endsWith(`:${port}`) &&
        parts[3] === 'LISTENING'
      ) {
        pids.add(parts[4]);
      }
    }
    return [...pids];
  } catch {
    return [];
  }
}

function killPort(port) {
  const pids = listeningPids(port);
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { shell: 'cmd.exe' });
      console.log(`[server] taskkill pid ${pid} on :${port}`);
    } catch {
      /* 已退出 */
    }
  }
  return pids.length;
}

async function waitForServer(url, timeoutMs = 60_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  return false;
}

// ── ② 合成器友好度：静态解析 styles/*.css ─────────────────────────────────
const COMPOSITOR_SAFE = new Set([
  'transform',
  'translate',
  'rotate',
  'scale',
  'opacity',
  'filter',
  'backdrop-filter',
  '-webkit-backdrop-filter',
]);
const CRITICAL_PATTERNS = [
  /cutter/,
  /\.btn/,
  /gain-stop/,
  /gain-pointer/,
  /tool-btn/,
  /track-block/,
  /feed-seg/,
  /gauge-needle/,
  /gauge-arc/,
  /toast/,
  /plug/,
  /cycle-plate/,
];
const isCritical = (selector) => CRITICAL_PATTERNS.some((re) => re.test(selector));

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// 顶层逗号切分（跳过括号内逗号，如 cubic-bezier(...)）
function splitTopLevel(str) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function parseDeclBlock(body) {
  const decls = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth === 0) {
      decls.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) decls.push(cur.trim());
  return decls
    .map((d) => {
      const i = d.indexOf(':');
      return i < 0 ? null : { prop: d.slice(0, i).trim(), value: d.slice(i + 1).trim() };
    })
    .filter(Boolean);
}

// 简易块级扫描器：@media 嵌套 → media 上下文栈；@keyframes → 名称表；普通规则 → 声明
function parseCssFile(file, text) {
  const css = stripComments(text);
  const keyframes = {}; // name -> [properties]
  const registered = new Set();
  const motions = []; // {kind, properties, selector, media, inRM, file, line, raw}
  const stack = [];
  let i = 0;
  let prelude = '';
  let line = 1;
  const countLines = (s) => (s.match(/\n/g) || []).length;

  while (i < css.length) {
    const ch = css[i];
    if (ch === '{') {
      const head = prelude.replace(/\s+/g, ' ').trim();
      prelude = '';
      if (head.startsWith('@keyframes')) {
        const name = head.split(/\s+/)[1];
        const props = new Set();
        let depth = 1;
        let body = '';
        let j = i + 1;
        while (j < css.length && depth > 0) {
          if (css[j] === '{') depth++;
          if (css[j] === '}') depth--;
          if (depth > 0) body += css[j];
          j++;
        }
        for (const blk of body.split('}')) {
          // 每段形如 "50% { decls"：丢弃块内最后一个 '{' 之前的选择器文本
          const decls = blk.slice(blk.lastIndexOf('{') + 1);
          for (const d of parseDeclBlock(decls)) props.add(d.prop);
        }
        keyframes[name] = [...props];
        line += countLines(css.slice(i, j));
        i = j;
        continue;
      }
      if (head.startsWith('@media')) {
        stack.push({ type: 'media', cond: head.replace(/^@media\s+/, '') });
        if (head.startsWith('@media') || head.startsWith('@property') || head.startsWith('@')) i++;
        else i++;
        continue;
      }
      if (head.startsWith('@property')) {
        const m = head.match(/@property\s+(--[^\s]+)/);
        if (m) registered.add(m[1]);
        stack.push({ type: 'block' });
        i++;
        continue;
      }
      if (head.startsWith('@')) {
        stack.push({ type: 'block' });
        i++;
        continue;
      }
      if (head) {
        // 样式规则：收集 transition / animation 声明
        const media = stack.filter((s) => s.type === 'media').map((s) => s.cond);
        const inRM = media.some((c) => c.includes('prefers-reduced-motion'));
        let depth = 1;
        let body = '';
        let j = i + 1;
        while (j < css.length && depth > 0) {
          if (css[j] === '{') depth++;
          if (css[j] === '}') depth--;
          if (depth > 0) body += css[j];
          j++;
        }
        for (const d of parseDeclBlock(body)) {
          if (d.prop === 'transition' || d.prop === 'transition-property') {
            const props =
              d.prop === 'transition-property'
                ? splitTopLevel(d.value)
                : splitTopLevel(d.value).map((seg) => seg.split(/\s+/)[0]);
            motions.push({
              kind: 'transition',
              properties: [...new Set(props)],
              selector: head,
              media,
              inRM,
              file,
              line,
              raw: `${d.prop}: ${d.value}`,
            });
          }
          if (d.prop === 'animation' || d.prop === 'animation-name') {
            // 名称与 keyframes 表做全局后置合并解析（machine.css 引用 motion.css 定义的动画）
            const words = d.value
              .replace(/!important/g, '')
              .split(/[\s,]+/)
              .filter(Boolean);
            motions.push({
              kind: 'animation',
              candidateWords: [...new Set(words)],
              selector: head,
              media,
              inRM,
              file,
              line,
              raw: `${d.prop}: ${d.value}`,
            });
          }
        }
        line += countLines(css.slice(i, j));
        i = j;
        continue;
      }
      i++;
    } else if (ch === '}') {
      stack.pop();
      prelude = '';
      i++;
    } else {
      prelude += ch;
      if (ch === '\n') line++;
      i++;
    }
  }
  return { keyframes, registered, motions };
}

function staticMotionAudit() {
  const files = ['tokens.css', 'base.css', 'machine.css', 'controls.css', 'responsive.css', 'motion.css'];
  const keyframes = {};
  const registered = new Set();
  const motions = [];
  for (const f of files) {
    const path = join(ROOT, 'src', 'styles', f);
    if (!existsSync(path)) continue;
    const r = parseCssFile(f, readFileSync(path, 'utf8'));
    Object.assign(keyframes, r.keyframes);
    for (const p of r.registered) registered.add(p);
    motions.push(...r.motions);
  }
  const safeProps = new Set([...COMPOSITOR_SAFE, ...registered]);
  for (const m of motions) {
    if (m.kind === 'animation') {
      if (/^animation(-name)?:\s*none/.test(m.raw)) {
        m.animation = null;
        m.properties = ['none'];
      } else {
        m.animation = m.candidateWords.find((w) => keyframes[w]) ?? null;
        m.properties = m.animation ? keyframes[m.animation] : ['<unresolved>'];
      }
      delete m.candidateWords;
    }
    m.bypass = m.properties.length === 1 && m.properties[0] === 'none'; // 直控旁路（.dragging / RM burning / freeze）
    m.flaggedProperties = m.bypass ? [] : m.properties.filter((p) => !safeProps.has(p));
    m.compositorFriendly = m.flaggedProperties.length === 0;
    m.criticalPath = isCritical(m.selector);
  }
  return {
    files,
    registeredProps: [...registered],
    keyframes,
    motions,
    summary: {
      totalDeclarations: motions.length,
      flagged: motions.filter((m) => !m.compositorFriendly),
      flaggedCritical: motions.filter((m) => !m.compositorFriendly && m.criticalPath),
      boxShadowAnimated: motions.filter((m) => m.properties.some((p) => p === 'box-shadow')),
    },
  };
}

// ── ①/③ 页内采集（cssPath 内嵌，函数序列化后自含） ─────────────────────────
const CSS_PATH_FN = `
  function cssPath(el) {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && parts.length < 4) {
      let part = cur.tagName.toLowerCase();
      if (cur.id) part += '#' + cur.id;
      else if (cur.classList.length) part += '.' + [...cur.classList].slice(0, 2).join('.');
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return (cur === document.body ? 'body > ' : '') + parts.join(' > ');
  }
`;

// ① 全量 backdrop-filter 普查（每状态一次，扫描全部元素）
async function surveyBackdrop(page) {
  return page.evaluate(`(() => {
    ${CSS_PATH_FN}
    const vw = innerWidth, vh = innerHeight, vArea = vw * vh;
    const els = [...document.querySelectorAll('*')].filter(
      (e) => getComputedStyle(e).backdropFilter !== 'none'
    );
    const items = els.map((e) => {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top);
      const x1 = Math.min(vw, r.right), y1 = Math.min(vh, r.bottom);
      const clipped = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
      const bf = cs.backdropFilter;
      const blurM = bf.match(/blur\\(([\\d.]+)px\\)/);
      const satM = bf.match(/saturate\\(([\\d.]+)\\)/);
      const alphas = [];
      for (const s of [cs.backgroundColor, cs.backgroundImage]) {
        for (const m of s.matchAll(/rgba?\\(\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*([\\d.]+)\\s*\\)/g)) {
          alphas.push(parseFloat(m[1]));
        }
      }
      return {
        sel: cssPath(e),
        backdropFilter: bf,
        blurPx: blurM ? parseFloat(blurM[1]) : 0,
        saturate: satM ? parseFloat(satM[1]) : null,
        rect: { w: Math.round(r.width), h: Math.round(r.height) },
        areaPx2: Math.round(r.width * r.height),
        clippedAreaPx2: Math.round(clipped),
        viewportPct: +((clipped / vArea) * 100).toFixed(1),
        bgMinAlpha: alphas.length ? Math.min(...alphas) : null,
        opacity: cs.opacity,
      };
    });
    const overlaps = [];
    for (let a = 0; a < items.length; a++) {
      for (let b = a + 1; b < items.length; b++) {
        const ra = els[a].getBoundingClientRect();
        const rb = els[b].getBoundingClientRect();
        const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ox > 0 && oy > 0) {
          overlaps.push({
            a: items[a].sel,
            b: items[b].sel,
            overlapPx2: Math.round(ox * oy),
            overlapViewportPct: +(((ox * oy) / vArea) * 100).toFixed(1),
          });
        }
      }
    }
    const total = items.reduce((s, it) => s + it.clippedAreaPx2, 0);
    return {
      viewport: { w: vw, h: vh, areaPx2: vArea },
      elements: items,
      count: items.length,
      totalBlurredClippedAreaPx2: total,
      totalViewportPct: +((total / vArea) * 100).toFixed(1),
      largeSingleSurfaces: items.filter((it) => it.viewportPct > 25).map((it) => it.sel),
      overlaps,
    };
  })()`);
}

// ③ backdrop-root 陷阱：稳态祖先链 + 进行中动画
async function surveyBackdropRoots(page) {
  return page.evaluate(`(() => {
    ${CSS_PATH_FN}
    const els = [...document.querySelectorAll('*')].filter(
      (e) => getComputedStyle(e).backdropFilter !== 'none'
    );
    return els.map((e) => {
      const cs = getComputedStyle(e);
      const traps = [];
      const notes = [];
      if (parseFloat(cs.opacity) < 1) traps.push({ rel: 'self', type: 'opacity', value: cs.opacity });
      let a = e.parentElement;
      while (a && a.nodeType === 1) {
        const acs = getComputedStyle(a);
        const t = [];
        if (parseFloat(acs.opacity) < 1) t.push({ type: 'opacity', value: acs.opacity });
        if (acs.filter && acs.filter !== 'none') t.push({ type: 'filter', value: acs.filter });
        if ((acs.maskImage && acs.maskImage !== 'none') || (acs.webkitMaskImage && acs.webkitMaskImage !== 'none'))
          t.push({ type: 'mask' });
        if (acs.mixBlendMode && acs.mixBlendMode !== 'normal')
          t.push({ type: 'mix-blend-mode', value: acs.mixBlendMode });
        if (acs.willChange && acs.willChange !== 'auto')
          t.push({ type: 'will-change', value: acs.willChange });
        if (acs.backdropFilter && acs.backdropFilter !== 'none')
          t.push({ type: 'ancestor-backdrop-filter', value: acs.backdropFilter });
        if ((acs.contain || '').includes('paint')) t.push({ type: 'contain:paint' });
        if (t.length) traps.push({ rel: 'ancestor:' + cssPath(a), issues: t });
        // 进行中的祖先动画：opacity/filter → 瞬时截断源；transform → 每 帧 重采样 开销
        const anims = a.getAnimations ? a.getAnimations() : [];
        for (const an of anims) {
          const keys = an.effect && an.effect.getKeyframes ? an.effect.getKeyframes() : [];
          const props = new Set(keys.flatMap((k) => Object.keys(k)));
          if ([...props].some((p) => p === 'opacity' || p === 'filter')) {
            notes.push({
              rel: 'ancestor:' + cssPath(a),
              kind: 'opacity/filter-animating',
              name: an.animationName || an.transitionProperty || 'transition',
              remainingMs: Math.round((an.effect.getComputedTiming().remaining ?? -1)),
            });
          } else if ([...props].some((p) => p === 'transform')) {
            notes.push({
              rel: 'ancestor:' + cssPath(a),
              kind: 'transform-animating（每帧重采样大面 blur 的开销源，非截断）',
              name: an.animationName || an.transitionProperty || 'transition',
              remainingMs: Math.round((an.effect.getComputedTiming().remaining ?? -1)),
            });
          }
        }
        a = a.parentElement;
      }
      return { sel: cssPath(e), backdropFilter: cs.backdropFilter, traps, notes };
    });
  })()`);
}

// ③ 瞬时截断采样：安装 rAF 采集器 → 触发动作 → 读取帧
async function installTransientCollector(page) {
  await page.evaluate(`(() => {
    ${CSS_PATH_FN}
    window.__m3collect = (durationMs) =>
      new Promise((resolve) => {
        const SELS = ['.machine-panel', '.cycle-plate', '.tool-btn', '.observation', '.status-line', '.dialog', '.dialog-backdrop', '.toast'];
        const frames = [];
        const t0 = performance.now();
        function grab(now) {
          const els = [...document.querySelectorAll(SELS.join(','))].filter(
            (e) => getComputedStyle(e).backdropFilter !== 'none'
          );
          const snap = els.map((e, idx) => {
            const cs = getComputedStyle(e);
            const traps = [];
            if (parseFloat(cs.opacity) < 1) traps.push({ rel: 'self', type: 'opacity', value: cs.opacity });
            let a = e.parentElement;
            while (a && a.nodeType === 1 && a !== document.documentElement) {
              const acs = getComputedStyle(a);
              if (parseFloat(acs.opacity) < 1 || (acs.filter && acs.filter !== 'none')) {
                traps.push({
                  rel: 'ancestor:' + cssPath(a),
                  type: parseFloat(acs.opacity) < 1 ? 'opacity' : 'filter',
                  value: parseFloat(acs.opacity) < 1 ? acs.opacity : acs.filter,
                });
              }
              a = a.parentElement;
            }
            return { key: idx + ':' + cssPath(e), selfOpacity: cs.opacity, traps };
          });
          frames.push({ tMs: Math.round(now - t0), snap });
          if (now - t0 < durationMs) requestAnimationFrame(grab);
          else resolve(frames);
        }
        requestAnimationFrame(grab);
      });
  })()`);
}

function summarizeTransient(frames) {
  const byKey = {};
  for (const f of frames) {
    for (const s of f.snap) {
      byKey[s.key] ??= { key: s.key, trapFrames: 0, firstT: null, lastT: null, kinds: new Set() };
      if (s.traps.length) {
        byKey[s.key].trapFrames++;
        if (byKey[s.key].firstT === null) byKey[s.key].firstT = f.tMs;
        byKey[s.key].lastT = f.tMs;
        for (const t of s.traps) byKey[s.key].kinds.add(`${t.rel}:${t.type}=${t.value ?? ''}`);
      }
    }
  }
  return Object.values(byKey)
    .filter((v) => v.trapFrames > 0)
    .map((v) => ({
      sel: v.key.split(':').slice(1).join(':'),
      framesAffected: v.trapFrames,
      ofFrames: frames.length,
      windowMs: [v.firstT, v.lastT],
      kinds: [...v.kinds],
    }));
}

// ④ 降级矩阵探针（在指定 emulate 组合下）
async function probeGlassMatrix(page) {
  return page.evaluate(`(() => {
    ${CSS_PATH_FN}
    const SELS = ['.machine-panel', '.cycle-plate', '.tool-btn', '.observation', '.status-line', '.dialog', '.dialog-backdrop'];
    const mm = (q) => matchMedia(q).matches;
    const rootCS = getComputedStyle(document.documentElement);
    const tok = (n) => rootCS.getPropertyValue(n).trim();
    const surfaces = SELS.map((s) => {
      const el = document.querySelector(s);
      if (!el) return { sel: s, present: false };
      const cs = getComputedStyle(el);
      const bf = cs.backdropFilter;
      const blurM = bf.match(/blur\\(([\\d.]+)px\\)/);
      const alphas = [];
      for (const str of [cs.backgroundColor, cs.backgroundImage]) {
        for (const m of str.matchAll(/rgba?\\(\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*([\\d.]+)\\s*\\)/g))
          alphas.push(parseFloat(m[1]));
      }
      return {
        sel: s,
        present: true,
        backdropFilter: bf === 'none' ? null : bf,
        blurPx: blurM ? parseFloat(blurM[1]) : null,
        bgMinAlpha: alphas.length ? Math.min(...alphas) : null,
        backgroundImage: cs.backgroundImage === 'none' ? null : cs.backgroundImage.slice(0, 110),
      };
    });
    const cutter = document.querySelector('[data-cutter="left"]');
    let focus = null;
    if (cutter) {
      cutter.focus();
      const cs = getComputedStyle(cutter);
      focus = {
        selector: cssPath(cutter),
        focusVisible: cutter.matches(':focus-visible'),
        outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor,
        tokenFocusWidth: tok('--focus-width'),
        tokenFocusRing: tok('--focus-ring'),
      };
    }
    return {
      media: {
        darkScheme: mm('(prefers-color-scheme: dark)'),
        contrastMore: mm('(prefers-contrast: more)'),
        reducedTransparency: mm('(prefers-reduced-transparency: reduce)'),
        reducedMotion: mm('(prefers-reduced-motion: reduce)'),
      },
      tokens: {
        '--paper': tok('--paper'),
        '--machine': tok('--machine'),
        '--mat-thick-bg': tok('--mat-thick-bg'),
        '--glass-float-bg': tok('--glass-float-bg'),
        '--glass-dark-bg': tok('--glass-dark-bg'),
        '--ink-soft': tok('--ink-soft'),
        '--focus-ring': tok('--focus-ring'),
        '--focus-width': tok('--focus-width'),
        '--mat-blur-s': tok('--mat-blur-s'),
        '--mat-blur-m': tok('--mat-blur-m'),
        '--mat-blur-l': tok('--mat-blur-l'),
        '--scrim-blur': tok('--scrim-blur'),
      },
      surfaces,
      focus,
    };
  })()`);
}

// ⑤ 帧健康度代理：IGNITE 期间 rAF 采样 2s
async function sampleIgniteFrames(page) {
  const p = page.evaluate(
    `new Promise((resolve) => {
      const intervals = [];
      const t0 = performance.now();
      let last = t0;
      function tick(now) {
        intervals.push(+(now - last).toFixed(2));
        last = now;
        if (now - t0 < 2000) requestAnimationFrame(tick);
        else {
          const mem = performance.memory ? {
            usedJSHeapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1),
            totalJSHeapMB: +(performance.memory.totalJSHeapSize / 1048576).toFixed(1),
            limitMB: +(performance.memory.jsHeapSizeLimit / 1048576).toFixed(1),
          } : null;
          resolve({
            intervalsMs: intervals,
            memory: mem,
            hardwareConcurrency: navigator.hardwareConcurrency,
            devicePixelRatio: devicePixelRatio,
            userAgent: navigator.userAgent,
          });
        }
      }
      requestAnimationFrame(tick);
    })`
  );
  await page.getByTestId('ignite').click();
  const raw = await p;
  const iv = raw.intervalsMs.slice(1).sort((a, b) => a - b); // 丢弃首帧（调度余量）
  const q = (pctl) => iv[Math.min(iv.length - 1, Math.floor((pctl / 100) * iv.length))];
  const mean = iv.reduce((s, v) => s + v, 0) / iv.length;
  return {
    ...raw,
    intervalsMs: undefined,
    stats: {
      frames: iv.length,
      meanMs: +mean.toFixed(2),
      medianMs: q(50),
      p95Ms: q(95),
      maxMs: iv[iv.length - 1],
      over20msPct: +((iv.filter((v) => v > 20).length / iv.length) * 100).toFixed(1),
      over34msPct: +((iv.filter((v) => v > 34).length / iv.length) * 100).toFixed(1),
    },
  };
}

// ── 流程驱动 ────────────────────────────────────────────────────────────────
async function gotoCycle1(page) {
  await page.goto(BASE);
  await page.getByTestId('power-on').click();
  await page.waitForTimeout(600);
  await page.getByTestId('ignite').click(); // D35：教学页直接 IGNITE 跳过
  await page.waitForTimeout(900); // mount-rise 实测窗口 ≈620ms（应用层延迟 + 220ms 动画），稳态须在其后
}

async function playRound(page, gain) {
  if (gain) {
    const stop = page.locator(`.gain-stop[data-value="${gain}"]`);
    if (await stop.isEnabled().catch(() => false)) await stop.click();
  }
  await page.getByTestId('ignite').click();
  await page.waitForTimeout(1150); // §8.3 950ms 反馈 + 余量
}

async function nextInput(page) {
  await page.getByTestId('next').click();
  await page.waitForTimeout(250);
}

async function surveyState(page, data, state, rootNote) {
  // 先采祖先链（捕捉进行中动画，如 burning 的 press-shake），再采全量普查
  data.backdropRoots[state] = {
    state,
    note: rootNote,
    elements: await surveyBackdropRoots(page),
  };
  const survey = await surveyBackdrop(page);
  data.states[state] = { ...survey, state };
}

// ── 主流程 ─────────────────────────────────────────────────────────────────
const data = { meta: {}, staticAudit: null, states: {}, backdropRoots: {}, transient: {}, matrix: {}, frames: null };

async function main() {
  const t0 = Date.now();
  data.meta = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    viewport: '1440x900 (Desktop Chrome)',
    port: PORT,
    note: 'M3 audit per UI_CONTRACT v4.5; no ?freeze params used; src/ untouched',
  };

  // ② 静态解析（无需浏览器）
  data.staticAudit = staticMotionAudit();
  console.log(
    `[static] ${data.staticAudit.summary.totalDeclarations} motion declarations, ` +
      `${data.staticAudit.summary.flagged.length} flagged (non-compositor), ` +
      `${data.staticAudit.summary.flaggedCritical.length} on critical path, ` +
      `${data.staticAudit.summary.boxShadowAnimated.length} animate box-shadow`
  );

  // dist 检查
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.log('[build] dist missing → npm run build');
    await new Promise((resolve, reject) => {
      const p = spawn('npm run build', { shell: true, cwd: ROOT, stdio: 'inherit' });
      p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error('build failed'))));
    });
  }

  // 端口占用检查（4188 必须专用）
  const pre = listeningPids(PORT);
  if (pre.length) {
    console.log(`[server] port ${PORT} busy (pids ${pre.join(',')}), killing first`);
    killPort(PORT);
    await sleep(800);
  }

  // 启动 preview
  const server = spawn(`npx vite preview --port ${PORT} --strictPort`, {
    shell: true,
    cwd: ROOT,
    stdio: 'ignore',
  });
  let serverKilled = false;
  const cleanup = async () => {
    if (serverKilled) return;
    serverKilled = true;
    try {
      server.kill();
    } catch {}
    await sleep(600);
    killPort(PORT); // Windows：netstat+taskkill 兜底
  };

  try {
    if (!(await waitForServer(BASE))) throw new Error(`preview did not start on ${BASE}`);
    console.log(`[server] vite preview up on ${BASE}`);

    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light',
    });

    // ── 状态 1：home（开机页） ──
    await page.goto(BASE);
    await page.getByTestId('power-on').waitFor();
    await page.waitForTimeout(400);
    await surveyState(page, data, 'home', '开机页稳态');

    // ── 状态 2：cycle（C01 可交互；mount-rise 实测 ≈620ms，等 900ms 保证稳态） ──
    await page.getByTestId('power-on').click();
    await page.waitForTimeout(600);
    await page.getByTestId('ignite').click();
    await page.waitForTimeout(900);
    await surveyState(page, data, 'cycle', 'C01 稳态');

    // ── dialog 稳态 + sheet-in/fade-in 瞬时截断 ──
    await page.getByTestId('settings-btn').click();
    await page.waitForTimeout(450); // sheet-in 320ms / fade-in 200ms 之后
    await surveyState(page, data, 'dialog', '设置打开稳态（动画完成后）');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await installTransientCollector(page);
    const dialogTransientPromise = page.evaluate(() => window.__m3collect(600));
    await page.getByTestId('settings-btn').click();
    const dialogFrames = await dialogTransientPromise;
    data.transient.dialogIn = {
      trigger: 'settings-btn click → sheet-in(320ms)+fade-in(200ms)',
      frames: dialogFrames.length,
      affected: summarizeTransient(dialogFrames),
    };
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // ── 状态 3：burning（IGNITE 反馈 250ms 处） ──
    await page.getByTestId('ignite').click();
    await page.waitForTimeout(250);
    await surveyState(page, data, 'burning', 'IGNITE 反馈 250ms 处（shake 进行中）');
    await page.waitForTimeout(1000); // 反馈结束

    // ── 走查 C02..C12；C04→C05 捕 mount-rise + toast ──
    for (let c = 2; c <= 12; c++) {
      if (c === 5) {
        await installTransientCollector(page);
        const mountPromise = page.evaluate(() => window.__m3collect(700));
        await page.getByTestId('next').click();
        const mountFrames = await mountPromise;
        data.transient.mountRise = {
          trigger: 'next → C05 mount（.machine > * mount-rise 220ms；含 toast-in 420ms）',
          frames: mountFrames.length,
          affected: summarizeTransient(mountFrames),
        };
        await page.waitForTimeout(150);
        const toastSurvey = await surveyBackdrop(page); // toast 存活 ~1.45s 内的机会窗口
        data.states.toast = { ...toastSurvey, state: 'toast' };
        await page.waitForTimeout(200);
      } else {
        await nextInput(page);
      }
      await playRound(page, c <= 4 ? 0 : c <= 6 ? 1 : 2);
      if (await page.getByTestId('ending-banner').isVisible().catch(() => false)) break;
    }
    // Cycle 12 无终局时仍需 next 才显示结局
    if (!(await page.getByTestId('ending-banner').isVisible().catch(() => false))) {
      const next = page.getByTestId('next');
      if (await next.isVisible().catch(() => false)) await nextInput(page);
    }

    // ── 状态 4：ending（结算页） ──
    await page.getByTestId('ending-banner').waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await surveyState(page, data, 'ending', '结算页稳态');

    await browser.close();

    // ── ④ 降级矩阵：独立页面 + CDP setEmulatedMedia（emulateMedia 无 reducedTransparency） ──
    const mBrowser = await chromium.launch();
    const mPage = await mBrowser.newPage({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light',
    });
    const cdp = await mPage.context().newCDPSession(mPage);
    const F = {
      scheme: (v) => ({ name: 'prefers-color-scheme', value: v }),
      contrast: (v) => ({ name: 'prefers-contrast', value: v }),
      rt: (v) => ({ name: 'prefers-reduced-transparency', value: v }),
      rm: (v) => ({ name: 'prefers-reduced-motion', value: v }),
    };
    const combos = [
      ['light-baseline', [F.scheme('light'), F.contrast('no-preference'), F.rt('no-preference'), F.rm('no-preference')]],
      ['reduced-transparency', [F.scheme('light'), F.contrast('no-preference'), F.rt('reduce'), F.rm('no-preference')]],
      ['contrast-more', [F.scheme('light'), F.contrast('more'), F.rt('no-preference'), F.rm('no-preference')]],
      ['dark', [F.scheme('dark'), F.contrast('no-preference'), F.rt('no-preference'), F.rm('no-preference')]],
      ['dark+reduced-transparency', [F.scheme('dark'), F.contrast('no-preference'), F.rt('reduce'), F.rm('no-preference')]],
      ['dark+contrast-more', [F.scheme('dark'), F.contrast('more'), F.rt('no-preference'), F.rm('no-preference')]],
      ['reduced-motion', [F.scheme('light'), F.contrast('no-preference'), F.rt('no-preference'), F.rm('reduce')]],
    ];
    await gotoCycle1(mPage);
    for (const [name, features] of combos) {
      await cdp.send('Emulation.setEmulatedMedia', { features });
      await mPage.waitForTimeout(150);
      const cycle = await probeGlassMatrix(mPage);
      await mPage.getByTestId('settings-btn').click();
      await mPage.waitForTimeout(450);
      const dialog = await probeGlassMatrix(mPage);
      await mPage.keyboard.press('Escape');
      await mPage.waitForTimeout(250);
      let rmProbe = null;
      if (name === 'reduced-motion') {
        rmProbe = await mPage.evaluate(() => {
          const btn = document.querySelector('.btn-primary');
          const cs = btn ? getComputedStyle(btn) : null;
          return cs
            ? {
                selector: '.btn-primary',
                transitionDuration: cs.transitionDuration,
                transitionProperty: cs.transitionProperty,
              }
            : null;
        });
      }
      data.matrix[name] = { features, cycle, dialog, rmProbe };
    }
    await mBrowser.close();

    // ── ⑤ 帧健康度：独立实例（优先 headed，失败回退 headless） ──
    let mode = 'headed';
    let fBrowser;
    try {
      fBrowser = await chromium.launch({ headless: false });
    } catch {
      fBrowser = await chromium.launch();
      mode = 'headless';
    }
    const fPage = await fBrowser.newPage({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light',
    });
    await gotoCycle1(fPage);
    data.frames = { mode, ...(await sampleIgniteFrames(fPage)) };
    await fBrowser.close();

    data.meta.elapsedSec = +((Date.now() - t0) / 1000).toFixed(1);
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log(`[done] wrote ${DATA_PATH} in ${data.meta.elapsedSec}s`);

    for (const [st, s] of Object.entries(data.states)) {
      console.log(
        `[survey:${st}] ${s.count} backdrop surfaces, total ${s.totalViewportPct}% viewport, ` +
          `large(>25%): ${s.largeSingleSurfaces.length}, overlaps: ${s.overlaps.length}`
      );
    }
    const f = data.frames.stats;
    console.log(
      `[frames:${data.frames.mode}] ${f.frames}f mean ${f.meanMs}ms p95 ${f.p95Ms}ms ` +
        `>20ms ${f.over20msPct}% >34ms ${f.over34msPct}%`
    );
  } finally {
    await cleanup();
    console.log('[server] preview terminated');
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  killPort(PORT);
});
