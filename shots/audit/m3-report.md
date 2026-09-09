# M3 性能与降级审计报告（UI_CONTRACT v4.5）

- 数据来源：`scripts/audit-perf.mjs` → `shots/audit/m3-data.json`（本文所有数字均出自该文件）
- 采集环境：`vite preview --port 4188`，Playwright Chromium（Desktop Chrome 1440×900，dpr=1，light），
  帧采样为 headed 模式，12 核 / ~160Hz vsync；未使用任何 `?freeze` 参数；`src/` 零改动
- 采集时间：2026-09-08；五状态：home / cycle(C01) / burning(IGNITE+250ms) / ending / dialog(设置开)，
  外加 toast 机会窗口（C05 入口）
- 本报告只给结论与修复方向，**不实施任何修复**（保留给后续集成批次）

---

## 1. backdrop-filter 表面普查（审计项 ①）

### 1.1 五状态汇总表

| 状态 | 玻璃面数 | 被模糊面积合计（视口%） | >25% 单面 | 同屏叠加对数 |
|---|---|---|---|---|
| home | 2 | 0.4% | 0 | 0 |
| cycle（C01 稳态） | 6 | 67.6% | 1（machine-panel 55.5%） | 2 |
| burning（反馈中） | 6 | 79.5% | 1（machine-panel **67.5%**） | 2 |
| toast（C05 入口） | 7 | 68.2% | 1（55.5%） | 2 |
| dialog（设置开） | 8 | **187.2%** | 2（backdrop 100%、panel 55.5%） | **12** |
| ending | 2 | 0.4% | 0 | 0 |

注：「面积合计」对叠加区域双计（dialog 态 187% > 100% 即叠加所致）。

### 1.2 逐面明细（cycle 态；burning 的差异单列）

| 表面 | backdrop-filter | 尺寸 | 视口% | 背景最小 α |
|---|---|---|---|---|
| `.machine-panel` | blur(26px) saturate(1.35) | 1088×661 | 55.5%（burning 1088×827 = **67.5%**，furnace-card 加入布局） | color-mix 92%（≈0.92 半透） |
| `.observation` | blur(10px) saturate(1.2) | 1042×104 | 8.4% | rgba 0.80–0.86 |
| `.status-line` | blur(10px) saturate(1.2) | 1042×38 | 3.1% | rgba 0.72–0.78 |
| `.cycle-plate` | blur(10px) saturate(1.35) | 135×35 | 0.4% | 0.78 |
| `.tool-btn` ×2 | blur(10px) saturate(1.35) | 89×36 / 44×36 | 0.2%+0.1% | 0.78 |
| `.toast`（仅 toast 窗口） | blur(18px) saturate(1.35) | 154×45 | 0.5% | 0.78 |
| `.dialog-backdrop`（仅 dialog 态） | blur(6px) | 1440×900 | **100%** | scrim 0.45 |
| `.dialog`（仅 dialog 态） | blur(18px) saturate(1.35) | 440×575 | 19.5% | rgba 0.86–0.90 |

### 1.3 大面积叠加判定（>25% 单面或同屏多层）

- **常态即超标**：`.machine-panel` 单面 26px blur 覆盖 55.5% 视口（burning 时 67.5%），
  叠加 `.observation`/`.status-line`（8.4% + 3.1% 与之相交）→ 采样链为「panel 模糊台面 → 内嵌窗再模糊 panel 组」双层。
- **dialog 态三层通道**：`machine-panel(55.5%) × dialog-backdrop(100%)` 相交 55.5%，
  `dialog-backdrop × dialog` 相交 19.5%，`machine-panel × dialog` 相交 19.5%。
  打开设置时合成器需同时维护：26px×55.5% + 6px×100% + 18px×19.5% + 10px×11.5%。
- home / ending 仅两个小工具钮（0.4%），无风险。

---

## 2. 合成器友好度（审计项 ②，静态解析 `src/styles/*.css`）

共解析 **29 条** transition/animation 声明（含 RM/freeze 覆盖块）。
合成器友好集 = transform/translate/rotate/scale/opacity/filter/backdrop-filter + 注册属性 `--knob-rot`（tokens.css:215 `@property`）。

**18 条友好**（press-shake、mount-rise、toast-in、sheet-in、fade-in、glyph-pulse、
title-pulse、furnace-flicker、cutter 槽弹簧、gauge-needle、gain-pointer、toast.show opacity、.cutter.dragging 旁路、freeze 旁路等）。

**11 条非友好，全部落在交互关键路径上**：

| 位置 | 声明 | 触发属性 | 关键路径 |
|---|---|---|---|
| controls.css:4 `.btn` | transition | **box-shadow**, background-color | 所有按钮回弹沿 |
| controls.css:22 `.btn:active` | transition | **box-shadow** | 按下沿 |
| controls.css:54 `.btn-primary:active` | transition | **box-shadow** | IGNITE/NEXT 按下 |
| controls.css:261 `.gain-stop` | transition | **box-shadow**, background-color | 卡位选中 |
| controls.css:286 `.gain-stop:active` | transition | **box-shadow** | 卡位按下 |
| machine.css:120 `.tool-btn` | transition | **box-shadow** | 工具钮 |
| machine.css:139 `.tool-btn:active` | transition | **box-shadow** | 工具钮按下 |
| controls.css:63 `.btn-primary.ignite-hint` | animation `ignite-hint-pulse` | **box-shadow**（1.4s **infinite**） | 教学 Step4 引导 |
| machine.css:263 `.feed-seg` | transition | **background-color**（150ms） | 裁刀拖拽路径（选区变化） |
| machine.css:340 `.gauge-arc-fg` | transition | **stroke-dashoffset**（320ms） | 每轮仪表数值更新 ×2 |
| controls.css:339 `.plug` | transition | **color** | 结局 E 插钮 hover |

另有 JS 内联动画不在 CSS 静态集内：`machine.ts:690/755` 行内 `furnace-flicker`（transform+filter，友好）。

### 2.1 box-shadow 动画频次量化与保留评估

- 声明数：8 处（上表 7 处 transition + `ignite-hint-pulse` keyframes，motion.css:74）。
- 每局频次估算：教学 IGNITE 1 + 局内 IGNITE 12 + NEXT 11 + GAIN 换挡 ≥2 次点击 + 设置开/关（dialog 内 `.btn` 关闭钮）2
  + locale 切换 1 + 复原 1 ≈ **30 次按压事件**，每次按压 = 按下沿（110ms `--press-in`）+ 回弹沿（300ms `--spring-snappy`）
  两段 box-shadow repaint。
- 面积：均为小面（IGNITE ≈292×56、卡位 46×46、工具钮 ≤89×36、关闭钮 44×44）→ 单次 repaint 代价低。
- **评估：保留**。UI_CONTRACT v4.3 明确冻结「按压反馈对：transform 位移与厚度阴影成对同动」——box-shadow 是语义必须项，
  不是可优化冗余；实测（§5）IGNITE 全程无可感知掉帧。不建议改动。
- 唯一常驻 repaint 源是 `ignite-hint-pulse`（教学 Step4 无限循环），见 P2-1。

---

## 3. backdrop-root 陷阱普查（审计项 ③，运行时实测）

### 3.1 稳态结构陷阱（持久存在，非动画）

| 玻璃面 | 陷阱 | 后果 |
|---|---|---|
| `.observation` | 祖先 `.machine-panel` 自身有 backdrop-filter → 构成 backdrop root | 采样被截断到 panel 组内：只能模糊面板自身渐变，**永远采不到台面**。设计意图「面板渐变透出层次」在组内成立，属结构事实 |
| `.status-line` | 同上 | 同上 |
| `.dialog` | 祖先 `.dialog-backdrop`（blur 6px）构成 backdrop root | dialog 的 18px blur 只模糊纯色 scrim，**视觉上近乎无效、纯采样开销**（19.5% 视口面积） |

稳态下无 opacity<1 / filter / mask / mix-blend-mode / will-change / contain:paint 陷阱
（`.observation .glyph` 的 `will-change: transform` 是后代，不影响）。

### 3.2 入场动画瞬时截断（rAF 逐帧实测）

| 场景 | 触发 | 受影响玻璃面 | 实测截断窗口 | 帧占比 |
|---|---|---|---|---|
| 周期装载 | `next` → C05（mount-rise 220ms 名义值） | panel（自身 opacity 0→1）+ cycle-plate/tool-btn×2/observation/status-line（经 `machine-header`/panel 祖先） | **43–560ms** | 26/35 帧 |
| toast 入场 | C05 解锁（toast-in 420ms 名义值，bouncy 前沿快） | `.toast` 自身 | 60–193ms | 9/35 帧 |
| 设置打开 | sheet-in(320ms) + fade-in(200ms) | `.dialog`（自身+backdrop 祖先）、`.dialog-backdrop`（自身） | dialog 48–331ms；backdrop 48–181ms | 5/14、3/14 帧 |
| 首页装载 | home mount-rise | `.tool-btn`×2（经 machine-header，survey 时祖先 opacity 0.892 仍在动画中） | 采样时刻 +400ms 仍未结束 | — |

**关键发现**：mount-rise 实际截断窗口 ≈620ms，是 220ms 名义值的 **2.8 倍**——专项探针显示动画前有 ~340ms
应用层延迟（click → renderCycle 之间）progress 恒为 0。期间 `.machine-panel`（26px blur、55.5% 视口）自身
opacity<1 → 自截断，厚材质「台面透出」效果全程缺席，动画结束一瞬「玻璃点亮」突跳。
UI_CONTRACT v4.0 调研依据已预判该陷阱形态（「入场动画结束态必须 opacity=1」），但被应用层延迟显著放大。

### 3.3 burning 期的重采样开销源（非截断）

`.machine.burning` 的 press-shake（480ms，transform）是 `.machine-panel`（26px blur、67.5% 视口）的**祖先变换动画**：
不截断 backdrop root，但变换祖先后代的大面 blur 需逐帧重新采样合成 → IGNITE 反馈 480ms 内约 29 帧都对
67.5% 视口的 26px blur 做全量重采样。这是全游戏最重的持续 GPU 峰值。shake 参数（A=5px·f=3.5Hz·τ=200ms）为
v3 冻结值，不可调（见 P1-2 的约束说明）。

---

## 4. 降级矩阵实测（审计项 ④，CDP `Emulation.setEmulatedMedia` 七组合）

`prefers-reduced-transparency` 在 Playwright 1.63 `emulateMedia` 中不可用，审计走 CDP 注入，
页内 `matchMedia` 回读验证全部组合生效。

### 4.1 逐项结论

| 项 | 组合 | 计算样式证据 | 结论 |
|---|---|---|---|
| 玻璃转实色 | RT (light) | `--glass-float-bg` → `#f7f2e2`（= --paper）；`.cycle-plate`/`.tool-btn` backgroundColor 变为无 α 的 rgb() 实色 | ✅ 浮层玻璃达标 |
| 玻璃转实色 | RT | `.toast` 同源令牌 | ✅（静态同规则） |
| 厚/深面转实色 | RT | `.machine-panel` backgroundImage 仍为 `color(srgb … / 0.92)`（color-mix 92% 硬编码）；`.observation` 仍 `rgba(35,33,27,.8)`；`.status-line` 仍 `rgba(38,36,32,.72)`；`.dialog` 仍 `rgba(45,43,36,.86)→(.9)` | ❌ **4 面未落回不透明**（P0-1） |
| blur 归零 | RT（light 与 dark+RT 双验证） | `--mat-blur-s/m/l`、`--scrim-blur` 全部解析为 0px；8 个表面 computed blurPx=0 | ✅ |
| blur 归零方式 | RT | backdrop-filter 仍为 `blur(0px) saturate(1.35)`，**未置 none** → 保留采样图层与 saturate pass | ⚠️ P1-1 |
| scrim 加深 | RT | `--scrim` 0.45 → 0.72，backdrop 计算背景 α=0.72 | ✅（按令牌） |
| 焦点环加粗 | CM (light) | `--focus-width` 4px、`--focus-ring` #4a3a08；聚焦裁刀 `outline: 4px solid rgb(74,58,8)` | ✅ |
| 焦点环加粗 | dark+CM（嵌套 @media） | `--focus-ring` #e8c14f、4px；outline 实证 `4px solid rgb(232,193,79)` | ✅ 嵌套媒体生效 |
| 深色令牌同套 | dark | `--paper` #cfc8b4、`--machine` #3a352a、`--glass-float-bg` α0.82、`--scrim` α0.55、`--focus-ring` #d4a72c | ✅ |
| 深色令牌同套 | dark+RT | `--mat-thick-bg` → `#3a352a`（dark machine 值）、`--glass-float-bg` → `#cfc8b4` | ✅ 令牌层正确（表面未接线同 P0-1） |
| 次级文字加深 | CM | `--ink-soft` #55503c → #3f3a2b（dark+CM → #8d8368） | ✅ |
| RM 全局 kill-switch | RM | `.btn-primary` transitionDuration `1e-05s` | ✅ |

（baseline 组合的 `focusVisible:false` 为脚本聚焦启发式伪影——该组合无先前键盘交互；后续组合经 Escape 后命中
`:focus-visible`，outline 均按令牌呈现，非产品缺陷。）

---

## 5. 帧健康度代理（审计项 ⑤，cycle 态 IGNITE，rAF 采样 2s，light，headed）

| 指标 | 值 |
|---|---|
| 模式 | headed Chromium，1440×900，dpr 1，12 核，~160Hz vsync |
| 采样帧数 | 319 |
| 帧间隔 mean / median / p95 | 6.27ms / 6.1ms / 6.2ms |
| max | 66.6ms（单帧，占比 0.3%，推测纹理分配/GC） |
| >20ms 帧占比 | 0.3% |
| >34ms 帧占比（丢帧） | 0.3% |
| JS heap（`performance.memory`） | used 2.6MB / total 5.4MB / limit 4192MB |

**结论**：IGNITE 反馈（press-shake + furnace-flicker + 弧线 + 指针 + 观察窗更新）在本机无可感知掉帧，
瓶颈不在渲染管线。注意两点局限：(a) 这是高端单机代理指标，mean 6.27ms 说明 vsync 之外余量充足，
低端 GPU / 高 dpr 设备才是 §1/§3 结构风险（dialog 态 187% 叠加、burning 态 67.5% 大面重采样）的兑现场景；
(b) headed 高刷屏下合成开销可能被 vsync 调度掩盖，该指标只作回归基线用。

---

## 6. 修复建议（P0 必须修 / P1 应修 / P2 可选）

> 本审计不实施以下任何改动；每条注明涉及文件与改法方向，供后续批次执行并扩展 `tests/material.test.ts` 断言。

### P0（必须修）—— 1 条

**P0-1 `prefers-reduced-transparency: reduce` 下四个表面未落回不透明（规格符合性缺口）**
- 证据：§4.1「厚/深面转实色」行；tokens.css:186–197 已定义 `--mat-thick-bg/--glass-dark-bg` 的 RT 覆盖值，但无任何表面引用它们。
- 涉及：`src/styles/machine.css:159–176`（.machine-panel，color-mix 92% 硬编码）、`machine.css:382–396`（.observation，rgba 硬编码）、
  `machine.css:461–475`（.status-line，rgba 硬编码）、`src/styles/controls.css:375–391`（.dialog，rgba 硬编码）。
- 方向：把四处的背景端点改引令牌（渐变端点用 `var(--mat-thick-bg)`/`var(--glass-dark-bg)` 或其 color-mix 派生），
  RT 块即可自然接管为 `var(--machine)`/`var(--coal)` 不透明值；同时按 v4.6 扩展 material.test.ts 断言
  （RT 媒询下四表面背景 α=1），防回归。

### P1（应修）—— 3 条

**P1-1 RT 降级下 backdrop-filter 应整体置 none**
- 证据：§4.1「blur 归零方式」行——`blur(0px) saturate(1.35)` 仍保留 backdrop 图层与 saturate 采样 pass。
- 涉及：`src/styles/tokens.css`（RT 媒询块）或各玻璃表面规则。
- 方向：在 `@media (prefers-reduced-transparency: reduce)` 内对玻璃选择器追加 `backdrop-filter: none;
  -webkit-backdrop-filter: none`，与 P0-1 同批交付、同批断言。

**P1-2 mount-rise 截断窗口被 ~340ms 应用层延迟放大至 ≈620ms，玻璃「点亮突跳」可感知化**
- 证据：§3.2 周期装载行（43–560ms，26/35 帧）+ 专项探针（click 后 progress 恒 0 约 340ms）；
  home 页同样存在（§3.2 首页装载行）。
- 涉及：`src/ui/machine.ts`（next/phaseTo → renderCycle 的时机，非 CSS）；`src/styles/motion.css:79–85`（mount-rise 定义）。
- 方向：优先排查并缩短 JS 侧渲染延迟（让 220ms 动画名副其实）；CSS 侧备选是 mount-rise 只动 transform 不动 opacity
  （入场即有完整玻璃采样，代价是失去淡入）——该取舍需所有者拍板，实现 agent 不擅自决定。

**P1-3 dialog 态三层 blur 通道：`.dialog` 的 18px blur 被 backdrop 截断后视觉无效、纯开销**
- 证据：§1.3（187.2% 合计、三对大叠加）+ §3.1（`.dialog` 采样根是 `.dialog-backdrop`，仅能模糊纯色 scrim）。
- 涉及：`src/styles/controls.css:375–391`（.dialog 的 blur 值）。
- 方向：`.dialog` 降用 `--mat-blur-s`(10px) 或直接去掉 backdrop-filter（其背景 α0.86–0.90 近实色，
  采样内容本就不可辨）；同时 dialog 打开期 48–331ms 的双面重采样窗口随之消失。视觉等价性以双平台基线重采验证。

### P2（可选）—— 3 条

**P2-1 `ignite-hint-pulse` 是唯一常驻 box-shadow repaint（教学 Step4，1.4s infinite）**
- 涉及：`src/styles/controls.css:63–66`、`src/styles/motion.css:74–77`。
- 方向：如需削减，改为伪元素 opacity 脉冲（合成器友好）或 transform scale；仅教学页存在且 RM 下已关闭，收益有限，低优先。

**P2-2 小面积 repaint 型动画保留观察（不改动）**
- `.feed-seg` background-color（拖拽路径，元素小）、`.gauge-arc-fg` stroke-dashoffset（每轮 ×2，116×60 表盘）、
  `.plug` color（结局 E hover）。实测 §5 无可感知代价，且弧线/选区高亮的表达依赖它们。**建议维持现状**，
  仅纳入下一轮低端设备实测的观察清单。

**P2-3 box-shadow 按压反馈对：保留决议（不改动）**
- §2.1 量化：~30 次按压/局 × 2 相位，均为 ≤292×56 小面；v4.3 契约语义必须（「位移与厚度阴影成对同动」）。
  **结论：保留，不建议以性能为由移除**；如未来低端实测出现压力，优先从 P1-3/P0-1 的大面项入手。

---

## 附：审计基建说明

- 脚本：`scripts/audit-perf.mjs`（可重复执行；自动 build-if-needed、起/杀 4188 preview——Windows netstat+taskkill 兜底；
  输出 `shots/audit/m3-data.json`）。不入 verify，属 M3 测试基建。
- 已知量化工件：瞬时采集器按元素实例计数（两个 `.tool-btn` 同 cssPath 分别计）；`bgMinAlpha` 对渐变表面
  会捕获默认透明 backgroundColor（=0），判定实色化请以 `backgroundImage` 字符串为准（§4 引用的即后者）。
